import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import Root from './src/navigation/Root';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import useTheme from './src/Hooks/useTheme';
import { getMessaging, onMessage, getToken, requestPermission } from '@react-native-firebase/messaging';
import NotificationService from './src/services/NotificationService';
const messaging = getMessaging();

const App = () => {
  const { colors } = useTheme();

  useEffect(() => {
  // async function initFCM() {
    // const authStatus = await requestPermission();
    // const token = await getToken(messaging);
    // console.log('FCM Token:', token);
  // }

  // initFCM();

  const unsubscribe = onMessage(messaging, async remoteMessage => {
    console.log('Foreground message:', remoteMessage);
    NotificationService.showNow(
      remoteMessage.notification?.title || 'New Notification',
      remoteMessage.notification?.body || '',
      'test-channel'
    );
  });

  return unsubscribe;
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <Root />
      </GestureHandlerRootView>
    </Provider>
  );
};

export default App;




