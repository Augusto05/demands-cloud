-- ========================================================
-- DEMANDS CLOUD - SUPABASE DATABASE SCHEMA (MULTI-TENANT)
-- RLS (Row Level Security) enabled on all tables
-- ========================================================

-- 1. OFFICES TABLE
CREATE TABLE IF NOT EXISTS public.offices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  office_id TEXT NOT NULL,
  name TEXT NOT NULL,
  daily_meta INT DEFAULT 100,
  color TEXT DEFAULT '#38BDF8',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, office_id)
);

ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own offices" ON public.offices;
CREATE POLICY "Users can manage their own offices"
  ON public.offices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. BASE DATA TABLE (Historical Daily Totals)
CREATE TABLE IF NOT EXISTS public.base_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  escritorio TEXT NOT NULL,
  boletos INT DEFAULT 0,
  contas INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.base_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own base_data" ON public.base_data;
CREATE POLICY "Users can manage their own base_data"
  ON public.base_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. DAILY HOURLY TRACKER TABLE
CREATE TABLE IF NOT EXISTS public.daily_hourly (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date_key TEXT NOT NULL,
  office_name TEXT NOT NULL,
  hourly JSONB DEFAULT '{}'::jsonb,
  contas INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date_key, office_name)
);

ALTER TABLE public.daily_hourly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own daily_hourly" ON public.daily_hourly;
CREATE POLICY "Users can manage their own daily_hourly"
  ON public.daily_hourly FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. KANBAN CARDS TABLE
CREATE TABLE IF NOT EXISTS public.kanban_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id TEXT NOT NULL,
  column_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Media',
  due_date TEXT,
  office_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own kanban_cards" ON public.kanban_cards;
CREATE POLICY "Users can manage their own kanban_cards"
  ON public.kanban_cards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. NOTES STORE TABLE
CREATE TABLE IF NOT EXISTS public.notes_store (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  folders JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notes_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes_store" ON public.notes_store;
CREATE POLICY "Users can manage their own notes_store"
  ON public.notes_store FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. BUGS REPORT TABLE
CREATE TABLE IF NOT EXISTS public.bugs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bug_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reproduction_steps TEXT,
  system_module TEXT,
  system_section TEXT,
  severity TEXT DEFAULT 'medio',
  frequency TEXT DEFAULT 'intermitente',
  offices JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'aberto',
  reported_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own bugs" ON public.bugs;
CREATE POLICY "Users can manage their own bugs"
  ON public.bugs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. FLOW CANVAS TABLE
CREATE TABLE IF NOT EXISTS public.flow_canvas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.flow_canvas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own flow_canvas" ON public.flow_canvas;
CREATE POLICY "Users can manage their own flow_canvas"
  ON public.flow_canvas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. APP USERS REGISTRY TABLE (CROSS-DEVICE SYNC)
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

-- 9. UNIVERSAL CLOUD COLLECTIONS TABLE (DIRECT SUPABASE DATABASE SYNC)
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


