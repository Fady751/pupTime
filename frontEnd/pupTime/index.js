import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import { setBackgroundMessageHandler, getMessaging } from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './src/services/NotificationService';

const messaging = getMessaging();

/**
 * Build the pending_navigation JSON payload for a given FCM data object.
 * Returns null if the type is unknown or data is missing required fields.
 */
function buildPendingNavigation(data) {
    if (!data?.type) {
        return null;
    }

    switch (data.type) {
        case 'Friend_Request':
        case 'Friend_Accepted':
            return JSON.stringify({ screen: 'Friends' });
        case 'Invitation':
            return JSON.stringify({ screen: 'SocialTask' });
        case 'Message': {
            const roomId = Number(data.room_id);
            if (!roomId) {
                return null;
            }
            return JSON.stringify({ screen: 'ChatRoom', params: { roomId } });
        }
        default:
            return null;
    }
}

// Background FCM handler — show the notification via notifee so it can be tapped.
setBackgroundMessageHandler(messaging, async remoteMessage => {
    console.log('Message handled in background!', remoteMessage);
    NotificationService.showNow(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || '',
        'test-channel',
        remoteMessage.data
    );
});

// User taps a notifee notification while the app is in the background.
notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
        const data = detail.notification?.data;
        const pending = buildPendingNavigation(data);
        if (pending) {
            await AsyncStorage.setItem('pending_navigation', pending);
        }
    }
});

AppRegistry.registerComponent(appName, () => App);
