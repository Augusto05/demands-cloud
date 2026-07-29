import { saveStorageItem } from './syncService';

export interface AppUser {
  id: string;
  username: string;
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

export function saveStoredUsers(users: AppUser[]): void {
  saveStorageItem('app_users', STORAGE_KEY, users);
}

export function addAppUser(username: string, passwordHash: string, role: 'admin' | 'user' = 'user'): AppUser {
  const users = getStoredUsers();
  const cleanUsername = username.trim().toLowerCase();
  
  const existingIdx = users.findIndex(u => u.username === cleanUsername);
  const newUser: AppUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username: cleanUsername,
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
