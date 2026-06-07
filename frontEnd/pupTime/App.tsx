import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import Root from './src/navigation/Root';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import useTheme from './src/Hooks/useTheme';
import { getMessaging, onMessage, getToken, requestPermission } from '@react-native-firebase/messaging';
import NotificationService from './src/services/NotificationService';
import { ThemeProvider } from './src/context/ThemeContext';
const messaging = getMessaging();

const AppContent = () => {
  const { colors } = useTheme();

  useEffect(() => {
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




