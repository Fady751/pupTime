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
import { AppState, Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';

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
  const [activeWarningReason, setActiveWarningReason] = React.useState<string | null>(null);

  useEffect(() => {
    // ─── Handle resume from background via AsyncStorage ─────────────────────
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        const pending = await AsyncStorage.getItem('pending_navigation');
        if (pending) {
          await AsyncStorage.removeItem('pending_navigation');
          try {
            const parsed = JSON.parse(pending);
            if (parsed.showReportReason) {
              setActiveWarningReason(parsed.showReportReason);
            } else {
              const { screen, params } = parsed;
              const checkNav = setInterval(() => {
                if (navigationRef.isReady()) {
                  clearInterval(checkNav);
                  navigate(screen, params);
                }
              }, 100);
              setTimeout(() => clearInterval(checkNav), 5000);
            }
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
        const data = detail.notification?.data as Record<string, any> | undefined;
        if (data?.type === 'Report' && data.reason) {
          setActiveWarningReason(data.reason);
        } else {
          routeFromData(data);
        }
      }
    });

    // ─── App was killed, opened by tapping the push banner ──────────────────
    const checkInitialNotification = async () => {
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification?.notification?.data) {
        const data = initialNotification.notification.data as Record<string, any>;
        if (data.type === 'Report' && data.reason) {
          setActiveWarningReason(data.reason);
        } else {
          const checkNav = setInterval(() => {
            if (navigationRef.isReady()) {
              clearInterval(checkNav);
              routeFromData(data);
            }
          }, 100);
          setTimeout(() => clearInterval(checkNav), 5000);
        }
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

      <Modal
        visible={activeWarningReason !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveWarningReason(null)}
      >
        <Pressable 
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
          onPress={() => setActiveWarningReason(null)}
        >
          <Pressable 
            style={{
              width: "100%",
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 8,
              gap: 16,
            }}
            onPress={() => {}}
          >
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.error }}>
              ⚠️ System Warning
            </Text>
            
            <Text style={{ fontSize: 15, color: colors.text, fontWeight: "600", lineHeight: 22 }}>
              Your account has been reported. Here is the reason provided:
            </Text>

            <View 
              style={{
                backgroundColor: colors.background,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1.5,
                borderColor: colors.border,
              }}
            >
              <Text 
                style={{ 
                  fontSize: 15, 
                  color: colors.text, 
                  lineHeight: 22, 
                  fontWeight: "500" 
                }}
              >
                {activeWarningReason}
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: "center",
                marginTop: 8,
              }}
              onPress={() => setActiveWarningReason(null)}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>
                Understood
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
