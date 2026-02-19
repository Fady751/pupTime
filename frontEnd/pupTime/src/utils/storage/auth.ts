import { setStorageItem, getStorageItem, removeStorageItem } from './localStorage';
import { User } from '../../types/user';

export type AuthData = {
  token?: string;
  id?: number;
  user?: User;
};

export async function saveData(data: AuthData): Promise<void> {
  await setStorageItem('auth', data);
}

export async function getData(): Promise<AuthData | null> {
  return await getStorageItem('auth');
}

export async function patchData(patch: Partial<AuthData>): Promise<void> {
  const existing = await getData();
  if (existing) {
    const updated = { ...existing, ...patch };
    await saveData(updated);
  }
}

export async function clearData(): Promise<void> {
  await removeStorageItem('auth');
}
