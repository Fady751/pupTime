import notifee, { TimestampTrigger, TriggerType, AndroidImportance } from '@notifee/react-native';

class NotificationService {
  /**
   * Helper function to ensure an Android channel exists.
   * Android requires channels to display notifications.
   */
  private async ensureChannel(channelId: string, channelName: string = 'App Notifications') {
    return await notifee.createChannel({
      id: channelId,
      name: channelName,
      importance: AndroidImportance.HIGH,
    });
  }

  /**
   * 1. Send a notification immediately (Now)
   */
  async showNow(title: string, body: string, channelId: string = 'general') {
    await notifee.requestPermission();
    await this.ensureChannel(channelId, 'General');

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        smallIcon: 'ic_stat_sync', // The custom icon we set up earlier
        color: '#ff9900', // pupTime orange
      },
    });
  }

  /**
   * 2. Schedule a notification at a specific time (Time X)
   */
  async scheduleAtTime(
    notificationId: string,
    title: string,
    body: string,
    timestampMs: number,
    channelId: string = 'scheduled'
  ) {
    await notifee.requestPermission();
    await this.ensureChannel(channelId, 'Scheduled Tasks');

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: timestampMs, // Time in milliseconds (e.g., date.getTime())
    };

    await notifee.createTriggerNotification(
      {
        id: notificationId, // Crucial for cancelling later!
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_stat_sync',
          color: '#ff9900',
        },
      },
      trigger
    );
  }

  /**
   * 3. Cancel a specific scheduled notification
   */
  async cancel(notificationId: string) {
    // This cancels the scheduled trigger and removes it if it's currently displayed
    await notifee.cancelNotification(notificationId);
    console.log(`Notification ${notificationId} cancelled.`);
  }

  /**
   * Optional: Cancel ALL scheduled notifications at once
   */
  async cancelAllScheduled() {
    await notifee.cancelTriggerNotifications();
    console.log('All scheduled notifications cancelled.');
  }
}

// Export a single instance of the service to be used across your app
export default new NotificationService();