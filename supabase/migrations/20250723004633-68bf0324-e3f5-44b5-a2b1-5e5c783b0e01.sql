-- Consolidate jobs and metrics
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  data JSONB DEFAULT '{}',
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to enum for better data consistency
DO $$ BEGIN
    CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
    
    ALTER TABLE public.jobs 
    ALTER COLUMN status TYPE job_status 
    USING status::job_status;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add better job tracking
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS result JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- Add indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_jobs_status_priority 
ON public.jobs(status, priority DESC)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_jobs_next_attempt 
ON public.jobs(next_attempt_at)
WHERE status = 'pending';

-- Job history for audit
CREATE TABLE IF NOT EXISTS public.job_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  status public.job_status NOT NULL,
  attempt_number INTEGER NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  result JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- Add job processing function
CREATE OR REPLACE FUNCTION public.process_pending_jobs(worker_id TEXT, batch_size INTEGER DEFAULT 10)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  job_id UUID;
BEGIN
  -- Get and lock jobs
  FOR job_id IN
    WITH jobs_to_process AS (
      SELECT id 
      FROM jobs
      WHERE status = 'pending'
        AND (locked_until IS NULL OR locked_until < NOW())
        AND (next_attempt_at <= NOW())
        AND (attempt_count < max_attempts)
      ORDER BY priority DESC, next_attempt_at ASC
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE jobs
    SET 
      status = 'processing',
      attempt_count = attempt_count + 1,
      last_attempt_at = NOW(),
      locked_until = NOW() + INTERVAL '5 minutes',
      locked_by = worker_id,
      updated_at = NOW()
    FROM jobs_to_process
    WHERE jobs.id = jobs_to_process.id
    RETURNING jobs.id
  LOOP
    -- Log job start in history
    INSERT INTO job_history (
      job_id, 
      status,
      attempt_number,
      metadata
    ) VALUES (
      job_id,
      'processing',
      (SELECT attempt_count FROM jobs WHERE id = job_id),
      jsonb_build_object(
        'worker_id', worker_id,
        'started_at', NOW()
      )
    );
    
    RETURN NEXT job_id;
  END LOOP;
  
  RETURN;
END;
$$;

-- Add job completion function
CREATE OR REPLACE FUNCTION public.complete_job(
  p_job_id UUID, 
  p_status job_status, 
  p_result JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  job_record RECORD;
  processing_time_ms INTEGER;
BEGIN
  -- Get job details
  SELECT * INTO job_record
  FROM jobs
  WHERE id = p_job_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;
  
  -- Calculate processing time
  processing_time_ms := EXTRACT(EPOCH FROM (NOW() - job_record.last_attempt_at)) * 1000;
  
  -- Update job status
  UPDATE jobs
  SET 
    status = p_status,
    result = CASE 
      WHEN p_status = 'completed' THEN p_result 
      ELSE NULL 
    END,
    error_message = CASE 
      WHEN p_status = 'failed' THEN p_error_message 
      ELSE NULL 
    END,
    next_attempt_at = CASE
      WHEN p_status = 'failed' AND attempt_count < max_attempts 
      THEN NOW() + (POWER(2, attempt_count) * INTERVAL '1 minute')
      ELSE NULL
    END,
    locked_until = NULL,
    locked_by = NULL,
    updated_at = NOW()
  WHERE id = p_job_id;
  
  -- Log completion in history
  INSERT INTO job_history (
    job_id,
    status,
    attempt_number,
    result,
    error_message,
    processing_time_ms,
    metadata
  ) VALUES (
    p_job_id,
    p_status,
    job_record.attempt_count,
    p_result,
    p_error_message,
    processing_time_ms,
    jsonb_build_object(
      'completed_at', NOW(),
      'next_attempt_at', CASE 
        WHEN p_status = 'failed' AND job_record.attempt_count < job_record.max_attempts 
        THEN NOW() + (POWER(2, job_record.attempt_count) * INTERVAL '1 minute')
        ELSE NULL
      END
    )
  );
END;
$$;

-- Add cleanup function for old job history
CREATE OR REPLACE FUNCTION public.cleanup_job_history(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM job_history
    WHERE processed_at < NOW() - (days_to_keep || ' days')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;