import * as Keychain from 'react-native-keychain';
import { User } from '../types/user';

export type AuthData = {
  token?: string;
  id?: number
  user?: User;
};

export async function saveData(data: AuthData): Promise<void> {
  await Keychain.setGenericPassword('userData', JSON.stringify(data));
}

export async function getData(): Promise<AuthData | null> {
  const creds = await Keychain.getGenericPassword();
  return creds ? JSON.parse(creds.password) : null;
}

export async function patchData(patch: Partial<AuthData>): Promise<void> {
  const existing = await getData();
  if (existing) {
    const updated = { ...existing, ...patch };
    await saveData(updated);
  }
}

export async function clearData(): Promise<void> {
  await Keychain.resetGenericPassword();
}
