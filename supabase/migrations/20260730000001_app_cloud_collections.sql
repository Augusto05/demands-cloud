-- ========================================================
-- DEMANDS - UNIVERSAL CLOUD COLLECTIONS TABLE
-- Enables real-time database sync across all devices for all app modules
-- ========================================================

CREATE TABLE IF NOT EXISTS public.app_cloud_collections (
  key TEXT PRIMARY KEY,
  data_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_cloud_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to app_cloud_collections" ON public.app_cloud_collections;
CREATE POLICY "Public full access to app_cloud_collections"
  ON public.app_cloud_collections FOR ALL
  USING (true)
  WITH CHECK (true);
