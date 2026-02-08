import * as Keychain from 'react-native-keychain';

export async function saveData(data: { token: string; id: number }): Promise<void> {
  await Keychain.setGenericPassword('userData', JSON.stringify(data));
}

export async function getData(): Promise<{ token: string; id: number } | null> {
  const creds = await Keychain.getGenericPassword();
  return creds ? JSON.parse(creds.password) : null;
}

export async function clearData(): Promise<void> {
  await Keychain.resetGenericPassword();
}
