-- Drop problematic table and recreate correctly
DROP TABLE IF EXISTS public.jobs CASCADE;

-- Create job_status enum first
DO $$ BEGIN
    CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create jobs table with proper enum type
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  data JSONB DEFAULT '{}',
  result JSONB DEFAULT NULL,
  error_message TEXT,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  priority INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  locked_by TEXT,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage jobs" 
ON public.jobs 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text);

-- Job history table
CREATE TABLE public.job_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status job_status NOT NULL,
  attempt_number INTEGER NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  result JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- Add RLS for job history
ALTER TABLE public.job_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage job history" 
ON public.job_history 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text);

-- Add indexes for performance
CREATE INDEX idx_jobs_status_priority ON public.jobs(status, priority DESC) WHERE status = 'pending';
CREATE INDEX idx_jobs_next_attempt ON public.jobs(next_attempt_at) WHERE status = 'pending';
CREATE INDEX idx_jobs_locked_until ON public.jobs(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX idx_job_history_job_id ON public.job_history(job_id);
CREATE INDEX idx_job_history_processed_at ON public.job_history(processed_at DESC);