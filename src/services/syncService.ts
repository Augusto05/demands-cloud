/**
 * Central Database Synchronization & Cloud Persistence Service (Supabase Database)
 * Enables real-time multi-device sync with strict User Scoping & Master Admin Aggregation.
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

export function getCurrentUsername(): string {
  return localStorage.getItem('demands_current_username') || 'admin';
}

export function isMasterAdmin(): boolean {
  return getCurrentUsername().trim().toLowerCase() === 'admin';
}

export function getUserScopedKey(baseKey: string, overrideUsername?: string): string {
  const username = overrideUsername || getCurrentUsername();
  const clean = username.trim().toLowerCase();
  if (baseKey === 'app_users' || baseKey === 'app_users_registry') {
    return baseKey;
  }
  return `${baseKey}:${clean}`;
}

export function getUserScopedLocalKey(localKey: string, overrideUsername?: string): string {
  const username = overrideUsername || getCurrentUsername();
  const clean = username.trim().toLowerCase();
  if (localKey === 'demands_app_users') return localKey;
  return `${localKey}_${clean}`;
}

/**
 * Fetch a data collection by key from Supabase Database (or local cache as fallback).
 * Uses strict user-scoping for standard users (e.g. offices:joao).
 */
export async function getStorageItem<T>(
  key: string,
  localKey: string,
  fallbackDefault: T,
  overrideUsername?: string
): Promise<T> {
  const scopedKey = getUserScopedKey(key, overrideUsername);
  const scopedLocalKey = getUserScopedLocalKey(localKey, overrideUsername);
  const localData = safeParse<T>(localStorage.getItem(scopedLocalKey), fallbackDefault);

  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_cloud_collections')
        .select('data_json')
        .eq('key', scopedKey)
        .maybeSingle();

      if (!error && data && data.data_json !== undefined) {
        const cloudVal = typeof data.data_json === 'string' ? JSON.parse(data.data_json) : data.data_json;
        localStorage.setItem(scopedLocalKey, JSON.stringify(cloudVal));
        return cloudVal as T;
      }
    } catch (e) {
      console.warn(`[syncService] Supabase fetch info for key "${scopedKey}":`, e);
    }
  }

  return localData;
}

/**
 * Save data collection to Supabase Database and update local cache with user scoping.
 */
export async function saveStorageItem<T>(
  key: string,
  localKey: string,
  data: T,
  overrideUsername?: string
): Promise<void> {
  const scopedKey = getUserScopedKey(key, overrideUsername);
  const scopedLocalKey = getUserScopedLocalKey(localKey, overrideUsername);

  // 1. Update local cache
  try {
    localStorage.setItem(scopedLocalKey, JSON.stringify(data));
  } catch (e) {
    console.error(`[syncService] LocalStorage save error for "${scopedLocalKey}":`, e);
  }

  // 2. Persist directly to Supabase Database
  if (supabase && isSupabaseConfigured) {
    try {
      await supabase
        .from('app_cloud_collections')
        .upsert({
          key: scopedKey,
          data_json: data,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn(`[syncService] Supabase cloud save catch for key "${scopedKey}":`, e);
    }
  }
}

/**
 * Fetch all stored collections from Supabase Database in 1 call for a specific user.
 */
export async function fetchAllStorage(overrideUsername?: string): Promise<Record<string, any>> {
  const username = overrideUsername || getCurrentUsername();
  const cleanUser = username.trim().toLowerCase();

  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_cloud_collections')
        .select('key, data_json');

      if (!error && data && Array.isArray(data)) {
        const result: Record<string, any> = {};
        for (const row of data) {
          const rowKey: string = row.key;
          const val = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
          
          if (cleanUser === 'admin') {
            result[rowKey] = val;
          } else if (rowKey.endsWith(`:${cleanUser}`) || rowKey === 'app_users') {
            const baseKey = rowKey.split(':')[0];
            result[baseKey] = val;
          }
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
 * Consolidate all user collections for Master Admin overview.
 */
export async function fetchConsolidatedAdminStorage(): Promise<{
  offices: any[];
  baseData: any[];
  dailyHourly: Record<string, any>;
  bugs: any[];
}> {
  const allRows = await fetchAllStorage('admin');
  const consolidatedOffices: any[] = [];
  const consolidatedBaseData: any[] = [];
  const consolidatedDailyHourly: Record<string, any> = {};
  const consolidatedBugs: any[] = [];

  const seenOfficeIds = new Set<string>();

  Object.entries(allRows).forEach(([key, val]) => {
    if (key.startsWith('offices:') && Array.isArray(val)) {
      val.forEach(off => {
        if (off && off.id && !seenOfficeIds.has(off.id)) {
          seenOfficeIds.add(off.id);
          consolidatedOffices.push(off);
        }
      });
    } else if (key.startsWith('base_data:') && Array.isArray(val)) {
      consolidatedBaseData.push(...val);
    } else if (key.startsWith('daily_hourly:') && typeof val === 'object' && val !== null) {
      Object.entries(val).forEach(([dateKey, dayObj]) => {
        if (!consolidatedDailyHourly[dateKey]) {
          consolidatedDailyHourly[dateKey] = {};
        }
        Object.assign(consolidatedDailyHourly[dateKey], dayObj);
      });
    } else if (key.startsWith('bugs:') && Array.isArray(val)) {
      consolidatedBugs.push(...val);
    }
  });

  return {
    offices: consolidatedOffices,
    baseData: consolidatedBaseData,
    dailyHourly: consolidatedDailyHourly,
    bugs: consolidatedBugs
  };
}

/**
 * Initial Auto-Migration
 */
export async function performInitialMigration(): Promise<void> {
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
}
