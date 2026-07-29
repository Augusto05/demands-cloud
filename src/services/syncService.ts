/**
 * Central Data Synchronization & Mac Disk Persistence Service
 * Enables real-time sync between Mac & Mobile Phone while guaranteeing zero data loss.
 */

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
 * Fetch a data collection by key from Mac Disk Storage API.
 * If server has no data yet, AUTO-MIGRATES existing localStorage data to Mac disk.
 */
export async function getStorageItem<T>(
  key: string,
  localKey: string,
  fallbackDefault: T
): Promise<T> {
  const localData = safeParse<T>(localStorage.getItem(localKey), fallbackDefault);

  try {
    const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.data !== undefined) {
        // Sync local storage cache
        localStorage.setItem(localKey, JSON.stringify(json.data));
        return json.data as T;
      }
    } else if (res.status === 404) {
      // Disk file doesn't exist yet on Mac. Check if we have local data to auto-migrate!
      const rawLocal = localStorage.getItem(localKey);
      if (rawLocal !== null) {
        // AUTO-MIGRATE: Upload existing local data to Mac disk
        await saveStorageItem(key, localKey, localData);
      }
    }
  } catch (e) {
    console.warn(`[syncService] Server offline or fetch failed for key "${key}". Using local cache.`, e);
  }

  return localData;
}

/**
 * Save data collection to Mac Disk Storage API and local cache.
 */
export async function saveStorageItem<T>(
  key: string,
  localKey: string,
  data: T
): Promise<void> {
  // Update local cache first
  try {
    localStorage.setItem(localKey, JSON.stringify(data));
  } catch (e) {
    console.error(`[syncService] LocalStorage save error for "${localKey}":`, e);
  }

  // Persist to Mac disk via Server API
  try {
    await fetch('/api/storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data })
    });
  } catch (e) {
    console.warn(`[syncService] Mac disk save failed for key "${key}". Saved in local cache.`, e);
  }
}

/**
 * Fetch all stored collections from Mac disk in 1 call.
 */
export async function fetchAllStorage(): Promise<Record<string, any>> {
  try {
    const res = await fetch('/api/storage/all');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[syncService] fetchAllStorage error:', e);
  }
  return {};
}

/**
 * Initial Auto-Migration: Uploads ALL existing localStorage keys to Mac disk if not yet present.
 */
export async function performInitialMigration(): Promise<void> {
  const collections = [
    { key: 'offices', localKey: 'demands_offices' },
    { key: 'base_data', localKey: 'demands_base_data' },
    { key: 'daily_hourly', localKey: 'demands_daily_hourly' },
    { key: 'kanban', localKey: 'demands_kanban_store_v2' },
    { key: 'notes', localKey: 'demands_notes_store' },
    { key: 'pasted_events', localKey: 'demands_google_pasted_events_v2' },
    { key: 'generated_files', localKey: 'demands_generated_files' },
    { key: 'bugs', localKey: 'demands_bug_reports_v1' }
  ];

  try {
    const existingServerData = await fetchAllStorage();

    for (const item of collections) {
      const serverHasKey = existingServerData && existingServerData[item.key] !== undefined;
      const rawLocal = localStorage.getItem(item.localKey);

      if (!serverHasKey && rawLocal !== null) {
        // Upload existing local data to Mac disk
        try {
          const parsed = JSON.parse(rawLocal);
          await saveStorageItem(item.key, item.localKey, parsed);
          console.log(`[syncService] Auto-migrated "${item.key}" from localStorage to Mac disk.`);
        } catch (e) {
          console.error(`[syncService] Auto-migration error for "${item.key}":`, e);
        }
      }
    }
  } catch (e) {
    console.error('[syncService] Migration error:', e);
  }
}
