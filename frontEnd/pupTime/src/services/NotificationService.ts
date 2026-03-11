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
   * Prepare permission + channel ahead of time (call once before a batch).
   */
  async prepare(channelId: string = 'scheduled', channelName: string = 'Scheduled Tasks') {
    await notifee.requestPermission();
    await this.ensureChannel(channelId, channelName);
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

    await this._createTrigger(notificationId, title, body, timestampMs, channelId);
  }

  /**
   * Schedule without requesting permission / creating channel (already prepared).
   */
  async scheduleAtTimePrepared(
    notificationId: string,
    title: string,
    body: string,
    timestampMs: number,
    channelId: string = 'scheduled'
  ) {
    await this._createTrigger(notificationId, title, body, timestampMs, channelId);
  }

  private async _createTrigger(
    notificationId: string,
    title: string,
    body: string,
    timestampMs: number,
    channelId: string,
  ) {
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: timestampMs,
    };

    await notifee.createTriggerNotification(
      {
        id: notificationId,
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
   * 4. Cancel array of notifications
   */
  async cancelNotifications(notificationIds: string[]) {
    await notifee.cancelTriggerNotifications(notificationIds);
    console.log(`Notifications ${notificationIds} cancelled.`);
  }

  /**
   * schedule
   */

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