import api from '../api';
import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

export type LoginPayload = {
  email: string;
  password: string;
    fcmToken: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  id?: number;
  token?: string;
  fcm_token?: string;
  error: string | null;
};

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version < 33) {
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return null;
    }

    await messaging().registerDeviceForRemoteMessages();
    const token = await messaging().getToken();
    return token || null;
  } catch (error) {
    console.log('Error getting FCM token:', error);
    return null;
  }
}

export const loginUser = async (
  payload: LoginPayload,
): Promise<LoginResponse> => {
  try {
    const fcmToken = await getFCMToken();

    console.log('FCM Token:', fcmToken);

    const requestBody: {
      email: string;
      password: string;
      fcm_token?: string;
    } = {
      email: payload.email,
      password: payload.password,
      fcm_token : payload.fcmToken,
    };

    if (fcmToken) {
      requestBody.fcm_token = fcmToken;
    }

    const response = await api.post('/user/login/', requestBody);

    return {
      success: response.data?.success ?? true,
      message: response.data?.message || 'Login completed',
      id: response.data?.user_id,
      token: response.data?.token,
      fcm_token: response.data?.fcm_token ?? fcmToken ?? undefined,
      error: null,
    };
  } catch (error: any) {
    console.error('Login error:', error.response?.data?.error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Login failed',
      error:
        error.response?.data?.error ||
        (error instanceof Error ? error.message : 'Login failed'),
    };
  }
};