-- ========================================================
-- DEMANDS - SISCOM DASHBOARD DAILY RECORDS TABLE
-- Synchronizes Siscom daily metrics across all devices
-- ========================================================

CREATE TABLE IF NOT EXISTS public.siscom_daily_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  record_date DATE NOT NULL,
  horas_rodadas NUMERIC(10, 2) DEFAULT 0,
  total_transferencias INT DEFAULT 0,
  leads_indicados INT DEFAULT 0,
  contas_abertas INT DEFAULT 0,
  produtividade_mailing NUMERIC(6, 2) DEFAULT 0,
  atritados NUMERIC(6, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_key, record_date)
);

ALTER TABLE public.siscom_daily_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to siscom_daily_records" ON public.siscom_daily_records;
CREATE POLICY "Public full access to siscom_daily_records"
  ON public.siscom_daily_records FOR ALL
  USING (true)
  WITH CHECK (true);
