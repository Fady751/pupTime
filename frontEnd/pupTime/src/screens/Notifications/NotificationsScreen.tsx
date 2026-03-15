import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import useTheme from '../../Hooks/useTheme';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../services/notificationApiService';
import type { ApiNotification } from '../../types/notification';
import { NOTIFICATION_TYPE_LABELS } from '../../types/notification';
import createStyles from './NotificationsScreen.styles';

const getErrorMessage = (error: any, fallback = 'Something went wrong'): string => {
  const data = error?.response?.data;

  if (typeof data === 'string') {
    return data;
  }

  if (data?.error && typeof data.error === 'string') {
    return data.error;
  }

  if (data?.message && typeof data.message === 'string') {
    return data.message;
  }

  return error?.message || fallback;
};

const getNotificationMessage = (notification: ApiNotification): string => {
  const message = notification.data?.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  return NOTIFICATION_TYPE_LABELS[notification.type] ?? 'New activity update.';
};

const getActorInitials = (notification: ApiNotification): string => {
  const user = notification.data?.user;
  if (typeof user !== 'object' || user === null) {
    return 'UP';
  }

  const username = (user as Record<string, unknown>).username;
  if (typeof username !== 'string' || !username.trim()) {
    return 'UP';
  }

  const parts = username.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatTimestamp = (createdAt: string): string => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'Just now';
  }

  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  }

  if (diffMs < day) {
    return `${Math.max(1, Math.floor(diffMs / hour))}h ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const NotificationsScreen = ({ navigation }: { navigation: any }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadData = useCallback(async (withSpinner = false) => {
    if (withSpinner) {
      setLoading(true);
    }

    try {
      setError(null);

      const [notificationsData, unread] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);

      const sortedNotifications = [...notificationsData].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setNotifications(sortedNotifications);
      setUnreadCount(unread);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load notifications.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  }, [loadData]);

  const handleMarkAsRead = async (notification: ApiNotification) => {
    if (notification.is_read) {
      return;
    }

    try {
      setMarkingId(notification.id);
      await markNotificationAsRead(notification.id);

      setNotifications(prev =>
        prev.map(item =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
              }
            : item,
        ),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to mark notification as read.'));
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!unreadCount) {
      return;
    }

    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to mark all notifications as read.'));
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = ({ item }: { item: ApiNotification }) => {
    const typeLabel = NOTIFICATION_TYPE_LABELS[item.type] ?? 'Update';
    const unread = !item.is_read;
    const isMarkingThis = markingId === item.id;

    return (
      <View style={[styles.notificationCard, unread && styles.notificationCardUnread]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIdentityRow}>
            <View style={[styles.avatarBubble, unread && styles.avatarBubbleUnread]}>
              <Text style={styles.avatarText}>{getActorInitials(item)}</Text>
            </View>
            <View>
              <View style={styles.typePill}>
                <Text style={styles.typePillText}>{typeLabel}</Text>
              </View>
              <Text style={styles.timestampText}>{formatTimestamp(item.created_at)}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, unread ? styles.statusBadgeUnread : styles.statusBadgeRead]}>
            <Text style={[styles.statusBadgeText, unread ? styles.statusBadgeTextUnread : styles.statusBadgeTextRead]}>
              {unread ? 'Unread' : 'Read'}
            </Text>
          </View>
        </View>

        <Text style={styles.messageText}>{getNotificationMessage(item)}</Text>

        {!item.is_read && (
          <Pressable
            disabled={isMarkingThis}
            onPress={() => handleMarkAsRead(item)}
            style={({ pressed }) => [
              styles.markAsReadButton,
              isMarkingThis && styles.disabledButton,
              { opacity: pressed ? 0.86 : 1 },
            ]}
          >
            <Text style={styles.markAsReadButtonText}>
              {isMarkingThis ? 'Marking...' : 'Mark as read'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />

        <View style={styles.headerCard}>
          <Pressable
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>{'‹'}</Text>
          </Pressable>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerKicker}>Inbox</Text>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>Track social activity and updates in one place.</Text>
          </View>

          <View style={styles.unreadCountBubble}>
            <Text style={styles.unreadCountNumber}>{unreadCount}</Text>
            <Text style={styles.unreadCountLabel}>unread</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            disabled={markingAll || unreadCount === 0}
            onPress={handleMarkAllAsRead}
            style={({ pressed }) => [
              styles.primaryActionButton,
              (markingAll || unreadCount === 0) && styles.disabledButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.primaryActionButtonText}>
              {markingAll ? 'Marking...' : 'Mark all as read'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [
              styles.secondaryActionButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.secondaryActionButtonText}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={styles.errorTitle}>Could not load notifications</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <Pressable
              onPress={() => loadData(true)}
              style={({ pressed }) => [
                styles.retryButton,
                { opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              notifications.length === 0 && styles.emptyListContent,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateEmoji}>🔔</Text>
                <Text style={styles.emptyStateTitle}>No notifications yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  You are all caught up. New activity will appear here.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
