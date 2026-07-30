/**
 * Central Database Synchronization & Cloud Persistence Service (Supabase Database)
 * Enables real-time multi-device sync across Mac, PC, & Mobile Phone.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Helper to safely parse JSON
const safeParse = <T>(val: string | null, fallback: T): T => {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

/**
 * Fetch a data collection by key from Supabase Database (or local cache as fallback).
 */
export async function getStorageItem<T>(
  key: string,
  localKey: string,
  fallbackDefault: T
): Promise<T> {
  const localData = safeParse<T>(localStorage.getItem(localKey), fallbackDefault);

  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_cloud_collections')
        .select('data_json')
        .eq('key', key)
        .maybeSingle();

      if (!error && data && data.data_json !== undefined) {
        const cloudVal = typeof data.data_json === 'string' ? JSON.parse(data.data_json) : data.data_json;
        localStorage.setItem(localKey, JSON.stringify(cloudVal));
        return cloudVal as T;
      }
    } catch (e) {
      console.warn(`[syncService] Supabase fetch info for key "${key}":`, e);
    }
  }

  return localData;
}

/**
 * Save data collection to Supabase Database and update local cache.
 */
export async function saveStorageItem<T>(
  key: string,
  localKey: string,
  data: T
): Promise<void> {
  // 1. Update local cache
  try {
    localStorage.setItem(localKey, JSON.stringify(data));
  } catch (e) {
    console.error(`[syncService] LocalStorage save error for "${localKey}":`, e);
  }

  // 2. Persist directly to Supabase Database
  if (supabase && isSupabaseConfigured) {
    try {
      await supabase
        .from('app_cloud_collections')
        .upsert({
          key,
          data_json: data,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn(`[syncService] Supabase cloud save catch for key "${key}":`, e);
    }
  }
}

/**
 * Fetch all stored collections from Supabase Database in 1 call.
 */
export async function fetchAllStorage(): Promise<Record<string, any>> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_cloud_collections')
        .select('key, data_json');

      if (!error && data && Array.isArray(data)) {
        const result: Record<string, any> = {};
        for (const row of data) {
          result[row.key] = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
        }
        return result;
      }
    } catch (e) {
      console.warn('[syncService] fetchAllStorage error:', e);
    }
  }
  return {};
}

/**
 * Initial Auto-Migration: Uploads ALL existing localStorage keys to Supabase Database.
 */
export async function performInitialMigration(): Promise<void> {
  // Wipe legacy mock data from localStorage if present
  const mockFlag = localStorage.getItem('demands_mock_cleared_v2');
  if (!mockFlag) {
    localStorage.removeItem('demands_offices');
    localStorage.removeItem('demands_base_data');
    localStorage.removeItem('demands_daily_hourly');
    localStorage.removeItem('demands_kanban_store');
    localStorage.removeItem('demands_kanban_store_v2');
    localStorage.removeItem('demands_notes_store');
    localStorage.removeItem('demands_flow_canvas_store');
    localStorage.removeItem('demands_bug_reports_v1');
    localStorage.setItem('demands_mock_cleared_v2', 'true');
  }

  const collections = [
    { key: 'offices', localKey: 'demands_offices' },
    { key: 'base_data', localKey: 'demands_base_data' },
    { key: 'daily_hourly', localKey: 'demands_daily_hourly' },
    { key: 'kanban', localKey: 'demands_kanban_store_v2' },
    { key: 'notes', localKey: 'demands_notes_store' },
    { key: 'pasted_events', localKey: 'demands_google_pasted_events_v2' },
    { key: 'generated_files', localKey: 'demands_generated_files' },
    { key: 'bugs', localKey: 'demands_bug_reports_v1' },
    { key: 'app_users', localKey: 'demands_app_users' }
  ];

  if (!supabase || !isSupabaseConfigured) return;

  try {
    const existingServerData = await fetchAllStorage();

    for (const item of collections) {
      const serverHasKey = existingServerData && existingServerData[item.key] !== undefined;
      const rawLocal = localStorage.getItem(item.localKey);

      if (!serverHasKey && rawLocal !== null) {
        try {
          const parsed = JSON.parse(rawLocal);
          await saveStorageItem(item.key, item.localKey, parsed);
          console.log(`[syncService] Auto-migrated "${item.key}" to Supabase Database.`);
        } catch (e) {
          console.error(`[syncService] Auto-migration error for "${item.key}":`, e);
        }
      }
    }
  } catch (e) {
    console.error('[syncService] Migration error:', e);
  }
}
