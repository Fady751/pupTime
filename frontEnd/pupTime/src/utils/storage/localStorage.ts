import * as Keychain from 'react-native-keychain';
import { AuthData } from './auth';

type StorageData = {
  auth?: AuthData;
  lastSync?: Date;
  [key: string]: any;
};

async function getStorage(): Promise<StorageData> {
  try {
    const creds = await Keychain.getGenericPassword();
    return creds? JSON.parse(creds.password): {};
  } catch (error) {
    console.error('[Storage] Failed to get storage:', error);
    return {};
  }
}

async function setStorage(data: StorageData): Promise<void> {
  try {
    await Keychain.setGenericPassword('appData', JSON.stringify(data));
  } catch (error) {
    console.error('[Storage] Failed to set storage:', error);
  }
}

export async function getStorageItem(key: string): Promise<any> {
  const storage = await getStorage();
  return storage[key] || null;
}

export async function setStorageItem(key: string, value: any): Promise<void> {
  const storage = await getStorage();
  storage[key] = value;
  await setStorage(storage);
}

export async function removeStorageItem(key: string): Promise<void> {
  const storage = await getStorage();
  delete storage[key];
  await setStorage(storage);
}

export async function clearStorage(): Promise<void> {
  await Keychain.resetGenericPassword();
}
