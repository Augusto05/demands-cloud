-- ========================================================
-- DEMANDS - ADD IMPRODUTIVOS COLUMN TO SISCOM DAILY RECORDS
-- ========================================================

ALTER TABLE public.siscom_daily_records
ADD COLUMN IF NOT EXISTS improdutivos NUMERIC(6, 2) DEFAULT 0;
