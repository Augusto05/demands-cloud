-- ========================================================
-- DEMANDS - ADD HOURLY_DATA COLUMN TO SISCOM DAILY RECORDS
-- ========================================================

ALTER TABLE public.siscom_daily_records
ADD COLUMN IF NOT EXISTS hourly_data JSONB DEFAULT '[]'::jsonb;
