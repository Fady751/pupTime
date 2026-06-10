import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import Root from './src/navigation/Root';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import useTheme from './src/Hooks/useTheme';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import NotificationService from './src/services/NotificationService';
import { ThemeProvider } from './src/context/ThemeContext';
import notifee, { EventType } from '@notifee/react-native';
import { navigate, navigationRef } from './src/navigation/navigationRef';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const messaging = getMessaging();

/**
 * Navigate to the correct screen based on FCM notification data.
 * Works for all 4 types: Friend_Request, Friend_Accepted, Invitation, Message.
 */
function routeFromData(data?: Record<string, any>) {
  if (!data?.type) {
    return;
  }

  switch (data.type) {
    case 'Friend_Request':
    case 'Friend_Accepted':
      navigate('Friends');
      break;
    case 'Invitation':
      navigate('SocialTask');
      break;
    case 'Message':
      navigate('ChatRoom', { roomId: Number(data.room_id) });
      break;
    default:
      break;
  }
}

const AppContent = () => {
  const { colors } = useTheme();

  useEffect(() => {
    // ─── Handle resume from background via AsyncStorage ─────────────────────
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        const pending = await AsyncStorage.getItem('pending_navigation');
        if (pending) {
          await AsyncStorage.removeItem('pending_navigation');
          try {
            const { screen, params } = JSON.parse(pending);
            const checkNav = setInterval(() => {
              if (navigationRef.isReady()) {
                clearInterval(checkNav);
                navigate(screen, params);
              }
            }, 100);
            setTimeout(() => clearInterval(checkNav), 5000);
          } catch {
            // ignore parse errors
          }
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // ─── Foreground FCM message — show in-app banner via notifee ────────────
    const unsubscribeFcm = onMessage(messaging, async remoteMessage => {
      console.log('Foreground message:', remoteMessage);
      NotificationService.showNow(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || '',
        'test-channel',
        remoteMessage.data,
      );
    });

    // ─── Foreground notifee press (user taps in-app banner) ─────────────────
    const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        routeFromData(detail.notification?.data as Record<string, any>);
      }
    });

    // ─── App was killed, opened by tapping the push banner ──────────────────
    const checkInitialNotification = async () => {
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification?.notification?.data) {
        const checkNav = setInterval(() => {
          if (navigationRef.isReady()) {
            clearInterval(checkNav);
            routeFromData(initialNotification.notification!.data as Record<string, any>);
          }
        }, 100);
        setTimeout(() => clearInterval(checkNav), 5000);
      }
    };

    checkInitialNotification();

    return () => {
      appStateSubscription.remove();
      unsubscribeFcm();
      unsubscribeNotifee();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <Root />
    </GestureHandlerRootView>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
};

export default App;
