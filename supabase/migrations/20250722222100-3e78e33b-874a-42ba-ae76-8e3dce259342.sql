-- Check if opening_hours column exists in establishments table
-- If not, add it as a JSONB column

DO $$
BEGIN
    -- Check if opening_hours column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'establishments' 
        AND column_name = 'opening_hours'
    ) THEN
        -- Add opening_hours column if it doesn't exist
        ALTER TABLE public.establishments 
        ADD COLUMN opening_hours JSONB DEFAULT NULL;
        
        -- Add comment explaining the structure
        COMMENT ON COLUMN public.establishments.opening_hours IS 'Store opening hours in format: {monday: {open: "08:00", close: "18:00", isClosed: false}, ...}';
    END IF;
END $$;