import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useTheme from '../../Hooks/useTheme';
import { createStyles } from './RecommendationDetails.styles';
import type { TaskTemplate } from '../../types/task';
import { getTaskOccurrences, getCurrentTimezone } from '../../types/task';
import { createTaskTemplate } from '../../services/TaskService/tasks';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
  none: '#9CA3AF',
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

type Props = { route?: any; navigation?: any };

const RecommendationDetailsScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const index: number = route?.params?.index ?? 0;

  /* ── Local task state (can be updated by edit screen) ── */
  const [task, setTask] = useState<TaskTemplate>(route?.params?.task);
  const [adding, setAdding] = useState(false);

  /* ── Listen for returned params from EditRecommendation ── */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = route?.params;
      if (params?.updatedTask) {
        setTask(params.updatedTask);
        navigation.setParams({ updatedTask: undefined });
      }
    });
    return unsubscribe;
  }, [navigation, route?.params]);

  /* ── Navigate to Edit ── */
  const handleEdit = useCallback(() => {
    navigation.navigate('EditRecommendation', { task, index });
  }, [navigation, task, index]);

  /* ── Add Task (create via API) ── */
  const handleAddTask = useCallback(async () => {
    if (adding) return;
    setAdding(true);

    try {
      // 1. Generate occurrences from the task
      const occurrences = getTaskOccurrences(task);

      // 2. Map occurrences to override objects
      const overrides = occurrences.map((datetime) => ({
        template_id: task.id,
        instance_datetime: datetime,
        status: 'PENDING',
      }));

      // 3. Build the task with overrides and correct timezone
      const taskToCreate: TaskTemplate = {
        ...task,
        timezone: getCurrentTimezone(),
        overrides: overrides as any,
      };

      // 4. Call the API
      await createTaskTemplate(taskToCreate);

      // 5. Success — navigate back and remove from list
      Alert.alert(
        'Task Added! ✅',
        `"${task.title}" has been added to your tasks.`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('RecommendedTasksList', {
                removedIndex: index,
              });
            },
          },
        ],
      );
    } catch (err: any) {
      console.error('[RecommendationDetails] addTask failed', err);
      Alert.alert('Error', 'Failed to create the task. Please try again.');
    } finally {
      setAdding(false);
    }
  }, [task, index, adding, navigation]);

  /* ── Go back and pass updated task to list ── */
  const handleGoBack = useCallback(() => {
    // Pass the (possibly edited) task back to the list screen
    navigation.navigate('RecommendedTasksList', {
      updatedTask: task,
      updatedIndex: index,
    });
  }, [navigation, task, index]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  if (!task) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor =
    PRIORITY_COLORS[task.priority ?? 'none'] ?? PRIORITY_COLORS.none;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Hero ── */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <Pressable style={styles.backBtn} onPress={handleGoBack}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.heroEmojiLarge}>{task.emoji || '💡'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={styles.heroSubtitle}>Suggestion Details</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ══════ BASIC INFO ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={styles.sectionLabel}>Basic Information</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>✏️</Text>
            <Text style={styles.detailLabel}>Title</Text>
            <Text style={styles.detailValue}>{task.title}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🎨</Text>
            <Text style={styles.detailLabel}>Emoji</Text>
            <Text style={[styles.detailValue, { fontSize: 24 }]}>
              {task.emoji || '—'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🚦</Text>
            <Text style={styles.detailLabel}>Priority</Text>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityColor },
              ]}
            >
              <Text style={styles.priorityBadgeText}>
                {(task.priority ?? 'none').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailIcon}>⏱️</Text>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {task.duration_minutes
                ? `${task.duration_minutes} minutes`
                : '—'}
            </Text>
          </View>
        </View>

        {/* ══════ SCHEDULE ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📅</Text>
            <Text style={styles.sectionLabel}>Schedule</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailLabel}>Start</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(task.start_datetime)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🔁</Text>
            <Text style={styles.detailLabel}>Frequency</Text>
            <Text style={styles.detailValue}>Once (not recurring)</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🔔</Text>
            <Text style={styles.detailLabel}>Reminder</Text>
            <Text style={styles.detailValue}>
              {task.reminder_time
                ? `${task.reminder_time} min before`
                : 'None'}
            </Text>
          </View>

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailIcon}>🌍</Text>
            <Text style={styles.detailLabel}>Timezone</Text>
            <Text style={styles.detailValue}>
              {task.timezone ?? 'UTC'}
            </Text>
          </View>
        </View>

        {/* ══════ ACTIONS ══════ */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.addBtn, adding && styles.addBtnDisabled]}
            onPress={handleAddTask}
            disabled={adding}
            activeOpacity={0.85}
          >
            {adding ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.addBtnText}>➕  Add Task</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleEdit}
            activeOpacity={0.85}
          >
            <Text style={styles.editBtnText}>✏️  Edit Suggestion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RecommendationDetailsScreen;
