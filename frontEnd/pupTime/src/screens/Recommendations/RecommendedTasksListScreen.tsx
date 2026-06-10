import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useTheme from '../../Hooks/useTheme';
import { createStyles } from './RecommendedTasksList.styles';
import { getHobbySelf, getHobbyFriends } from '../../services/hobbyService';
import {
  mapSuggestionToTaskTemplate,
  type HobbySuggestion,
  type RecommendationType,
} from '../../types/recommendation';
import type { TaskTemplate } from '../../types/task';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
  none: '#9CA3AF',
};

const FRIENDS_PAGE_SIZE = 3;

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
};

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

type Props = { route?: any; navigation?: any };

const RecommendedTasksListScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const type: RecommendationType = route?.params?.type ?? 'self';

  /* ── State ── */
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noFriendsMessage, setNoFriendsMessage] = useState<string | null>(null);

  // Friends pagination
  const [friendsOffset, setFriendsOffset] = useState(0);
  const [hasMoreFriends, setHasMoreFriends] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /* ── Initial Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoFriendsMessage(null);
    setTasks([]);
    setFriendsOffset(0);
    setHasMoreFriends(true);

    try {
      if (type === 'self') {
        const data = await getHobbySelf();
        const mapped = data.map(mapSuggestionToTaskTemplate);
        setTasks(mapped);
      } else {
        const data = await getHobbyFriends();

        // Handle the special "no friends" object response
        if (!Array.isArray(data)) {
          setNoFriendsMessage(data.message);
          return;
        }

        const mapped = data.map(mapSuggestionToTaskTemplate);
        setTasks(mapped);
        setFriendsOffset(FRIENDS_PAGE_SIZE);
        if (data.length < FRIENDS_PAGE_SIZE) {
          setHasMoreFriends(false);
        }
      }
    } catch (err: any) {
      console.error('[RecommendedTasksList] fetch failed', err);
      setError('Failed to load suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Load More (friends pagination) ── */
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMoreFriends) return;

    setLoadingMore(true);
    try {
      const data = await getHobbyFriends(friendsOffset);

      if (!Array.isArray(data)) {
        setHasMoreFriends(false);
        return;
      }

      const mapped = data.map(mapSuggestionToTaskTemplate);
      setTasks((prev) => [...prev, ...mapped]);
      setFriendsOffset((prev) => prev + FRIENDS_PAGE_SIZE);

      if (data.length < FRIENDS_PAGE_SIZE) {
        setHasMoreFriends(false);
      }
    } catch (err: any) {
      console.error('[RecommendedTasksList] load more failed', err);
    } finally {
      setLoadingMore(false);
    }
  }, [friendsOffset, hasMoreFriends, loadingMore]);

  /* ── Listen for returned params from Details/Edit ── */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = route?.params;

      if (params?.updatedTask != null && params?.updatedIndex != null) {
        setTasks((prev) => {
          const updated = [...prev];
          if (params.updatedIndex < updated.length) {
            updated[params.updatedIndex] = params.updatedTask;
          }
          return updated;
        });
        // Clear the params so they don't re-apply
        navigation.setParams({ updatedTask: undefined, updatedIndex: undefined });
      }

      if (params?.removedIndex != null) {
        setTasks((prev) => prev.filter((_, i) => i !== params.removedIndex));
        navigation.setParams({ removedIndex: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route?.params]);

  /* ── Navigate to details ── */
  const handleTaskPress = useCallback(
    (task: TaskTemplate, index: number) => {
      navigation.navigate('RecommendationDetails', { task, index });
    },
    [navigation],
  );

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  const headerTitle = type === 'friends' ? 'Friend Suggestions' : 'For You';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Hero Header ── */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.heroTitle}>{headerTitle}</Text>
        </View>
      </View>

      {/* ── Loading ── */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding suggestions…</Text>
        </View>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.emptyMessage}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {/* ── No Friends Message ── */}
      {!loading && noFriendsMessage && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No Friends Yet</Text>
          <Text style={styles.emptyMessage}>{noFriendsMessage}</Text>
        </View>
      )}

      {/* ── Empty Results ── */}
      {!loading && !error && !noFriendsMessage && tasks.length === 0 && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No Suggestions</Text>
          <Text style={styles.emptyMessage}>
            We couldn't find any suggestions right now. Try again later!
          </Text>
        </View>
      )}

      {/* ── Task List ── */}
      {!loading && !error && !noFriendsMessage && tasks.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {tasks.map((task, index) => {
            const priorityColor =
              PRIORITY_COLORS[task.priority ?? 'none'] ?? PRIORITY_COLORS.none;

            return (
              <Pressable
                key={`${task.id}-${index}`}
                style={styles.taskCard}
                onPress={() => handleTaskPress(task, index)}
              >
                <View style={styles.taskEmojiContainer}>
                  <Text style={styles.taskEmoji}>{task.emoji || '💡'}</Text>
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskMeta}>
                    {formatDate(task.start_datetime!)} •{' '}
                    {formatTime(task.start_datetime!)} •{' '}
                    {task.duration_minutes} min
                  </Text>
                </View>
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: priorityColor },
                  ]}
                />
              </Pressable>
            );
          })}

          {/* Load More (friends only) */}
          {type === 'friends' && hasMoreFriends && (
            <Pressable
              style={styles.loadMoreBtn}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.loadMoreBtnText}>Load More</Text>
              )}
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default RecommendedTasksListScreen;
