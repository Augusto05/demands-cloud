import { saveStorageItem } from './syncService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
}

const STORAGE_KEY = 'demands_app_users';

export function getStoredUsers(): AppUser[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error(e);
    }
  }
  return [];
}

export async function syncAppUsersFromCloud(): Promise<AppUser[]> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_users_registry')
        .select('users_json')
        .eq('id', 'global_users')
        .maybeSingle();

      if (!error && data && data.users_json) {
        const cloudUsers = typeof data.users_json === 'string' ? JSON.parse(data.users_json) : data.users_json;
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudUsers));
          return cloudUsers;
        }
      }
    } catch (e) {
      console.warn('[userService] Cloud sync fetch info:', e);
    }
  }
  return getStoredUsers();
}

export async function saveStoredUsers(users: AppUser[]): Promise<void> {
  // 1. Local Cache & Disk Sync
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  saveStorageItem('app_users', STORAGE_KEY, users);

  // 2. Cloud Sync via Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      await supabase
        .from('app_users_registry')
        .upsert({ id: 'global_users', users_json: users, updated_at: new Date().toISOString() });
    } catch (e) {
      console.warn('[userService] Cloud sync catch:', e);
    }
  }
}

export function addAppUser(username: string, passwordHash: string, name?: string, role: 'admin' | 'user' = 'user'): AppUser {
  const users = getStoredUsers();
  const cleanUsername = username.trim().toLowerCase();
  const displayName = (name && name.trim()) ? name.trim() : (cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1));
  
  const existingIdx = users.findIndex(u => u.username === cleanUsername);
  const newUser: AppUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username: cleanUsername,
    name: displayName,
    passwordHash,
    role,
    createdAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    users[existingIdx] = newUser;
  } else {
    users.push(newUser);
  }

  saveStoredUsers(users);
  return newUser;
}

export function removeAppUser(id: string): void {
  const users = getStoredUsers().filter(u => u.id !== id);
  saveStoredUsers(users);
}

export function getUserDisplayName(username: string): string {
  const cleanUser = username.trim().toLowerCase();
  if (cleanUser === 'admin') {
    return 'Administrador';
  }
  const users = getStoredUsers();
  const found = users.find(u => u.username === cleanUser);
  if (found && found.name) {
    return found.name;
  }
  return cleanUser ? (cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1)) : 'Usuário';
}

export function verifyAppUser(username: string, passwordHash: string): boolean {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = passwordHash.trim();

  if (cleanUser === 'admin' && cleanPass === 'demands_cloud_admin') {
    return true;
  }
  const users = getStoredUsers();
  const found = users.find(u => u.username === cleanUser);
  if (found && found.passwordHash === cleanPass) {
    return true;
  }
  return false;
}
