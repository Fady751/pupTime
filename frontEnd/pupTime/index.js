/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import { setBackgroundMessageHandler, getMessaging } from '@react-native-firebase/messaging';
import NotificationService from './src/services/NotificationService';

const messaging = getMessaging();

setBackgroundMessageHandler(messaging, async remoteMessage => {
    console.log('Message handled in background!', remoteMessage);
    NotificationService.showNow(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || '',
        'test-channel'
    );
});

AppRegistry.registerComponent(appName, () => App);
