-- ========================================================
-- DEMANDS CLOUD - APP USERS REGISTRY MIGRATION
-- Enables cross-device user sync (Mac, Mobile, Other Devices)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.app_users_registry (
  id TEXT PRIMARY KEY DEFAULT 'global_users',
  users_json JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_users_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to app_users_registry" ON public.app_users_registry;
CREATE POLICY "Public full access to app_users_registry"
  ON public.app_users_registry FOR ALL
  USING (true)
  WITH CHECK (true);
