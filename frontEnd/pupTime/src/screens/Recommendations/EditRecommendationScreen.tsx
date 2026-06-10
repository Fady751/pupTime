import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import useTheme from '../../Hooks/useTheme';
import { createStyles } from './EditRecommendation.styles';
import type { TaskTemplate } from '../../types/task';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_META: Record<
  string,
  { color: string; emoji: string; label: string }
> = {
  low: { color: '#22C55E', emoji: '🟢', label: 'Low' },
  medium: { color: '#F59E0B', emoji: '🟠', label: 'Medium' },
  high: { color: '#EF4444', emoji: '🔴', label: 'High' },
  none: { color: '#9CA3AF', emoji: '⚪', label: 'None' },
};

const PRIORITY_KEYS = ['none', 'low', 'medium', 'high'] as const;

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

type Props = { route?: any; navigation?: any };

const EditRecommendationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const originalTask: TaskTemplate = route?.params?.task;
  const index: number = route?.params?.index ?? 0;

  /* ── Form State ── */
  const [title, setTitle] = useState(originalTask?.title ?? '');
  const [emoji, setEmoji] = useState(originalTask?.emoji ?? '💡');
  const [priority, setPriority] = useState<string>(
    originalTask?.priority ?? 'none',
  );
  const [startDatetime, setStartDatetime] = useState<string>(
    originalTask?.start_datetime ?? new Date().toISOString(),
  );
  const [durationMinutes, setDurationMinutes] = useState<string>(
    originalTask?.duration_minutes
      ? String(originalTask.duration_minutes)
      : '60',
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const emojiInputRef = useRef<TextInput | null>(null);

  /* ── Date / Time Handlers ── */
  const onDateChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowDatePicker(false);
    if (_e.type === 'dismissed' || !d) return;
    const u = new Date(startDatetime);
    u.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setStartDatetime(u.toISOString());
  };

  const onTimeChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowTimePicker(false);
    if (_e.type === 'dismissed' || !d) return;
    const u = new Date(startDatetime);
    u.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setStartDatetime(u.toISOString());
  };

  /* ── Save (local only — no API call) ── */
  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a task title.');
      return;
    }
    if (!emoji) {
      Alert.alert('Missing Icon', 'Please select an icon for your task.');
      return;
    }
    const dur = Number(durationMinutes);
    if (!Number.isFinite(dur) || dur <= 0) {
      Alert.alert(
        'Missing Duration',
        'Please enter a valid duration in minutes.',
      );
      return;
    }

    const updatedTask: TaskTemplate = {
      ...originalTask,
      title: title.trim(),
      emoji,
      priority: priority as any,
      start_datetime: startDatetime,
      duration_minutes: dur,
    };

    // Navigate back to details, passing updated task
    navigation.navigate('RecommendationDetails', {
      updatedTask,
      index,
    });
  }, [
    title,
    emoji,
    priority,
    startDatetime,
    durationMinutes,
    originalTask,
    index,
    navigation,
  ]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  const displayDate = new Date(startDatetime);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Hero Header ── */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.heroTitle}>Edit Suggestion</Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {emoji ? `${emoji} ` : ''}
              {originalTask?.title}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ══════ ICON ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🎨</Text>
            <Text style={styles.sectionLabel}>Icon *</Text>
          </View>
          <View style={styles.emojiPickerContainer}>
            <Text style={styles.emojiPickerHelpText}>
              Tap the circle below to select any emoji from your keyboard
            </Text>
            <Pressable
              style={styles.emojiInputWrapper}
              onPress={() => emojiInputRef.current?.focus()}
            >
              <TextInput
                ref={emojiInputRef}
                style={styles.emojiTextInput}
                value={emoji}
                onChangeText={(text) => {
                  const chars = Array.from(text);
                  if (chars.length > 0) {
                    setEmoji(chars[chars.length - 1]);
                  } else {
                    setEmoji('');
                  }
                }}
                maxLength={8}
                placeholder=""
                placeholderTextColor={colors.secondaryText}
                textAlign="center"
              />
            </Pressable>
            {emoji ? (
              <TouchableOpacity
                style={styles.clearEmojiButton}
                onPress={() => setEmoji('')}
              >
                <Text style={styles.clearEmojiButtonText}>Clear Icon</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ══════ TITLE ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>✏️</Text>
            <Text style={styles.sectionLabel}>Task Name *</Text>
          </View>
          <View style={styles.titleInputContainer}>
            {emoji ? <Text style={styles.titleEmoji}>{emoji}</Text> : null}
            <TextInput
              style={styles.titleInput}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.secondaryText}
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        {/* ══════ PRIORITY ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🚦</Text>
            <Text style={styles.sectionLabel}>Priority *</Text>
          </View>
          <View style={styles.priorityRow}>
            {PRIORITY_KEYS.map((p) => {
              const meta = PRIORITY_META[p];
              const active = priority === p;
              return (
                <Pressable
                  key={p}
                  style={[
                    styles.priorityChip,
                    active && styles.priorityChipSelected,
                    active && {
                      borderColor: meta.color,
                      backgroundColor: meta.color + '18',
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      {
                        color: active ? meta.color : colors.secondaryText,
                      },
                    ]}
                  >
                    {meta.emoji} {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ══════ DATE & TIME ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📅</Text>
            <Text style={styles.sectionLabel}>Schedule *</Text>
          </View>
          <View style={styles.dateTimeRow}>
            <Pressable
              style={styles.dateTimeBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeIcon}>📅</Text>
              <View>
                <Text style={styles.dateTimeLabel}>Date</Text>
                <Text style={styles.dateTimeText}>
                  {displayDate.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.dateTimeBtn}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeIcon}>⏰</Text>
              <View>
                <Text style={styles.dateTimeLabel}>Time</Text>
                <Text style={styles.dateTimeText}>
                  {displayDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </Pressable>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={displayDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={displayDate}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}
        </View>

        {/* ══════ DURATION ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>⏱️</Text>
            <Text style={styles.sectionLabel}>Duration *</Text>
          </View>
          <View style={styles.durationRow}>
            <Text style={styles.durationIcon}>⏱</Text>
            <TextInput
              style={styles.durationInput}
              placeholder="e.g. 30"
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
            />
            <Text style={styles.durationUnit}>min</Text>
          </View>
        </View>

        {/* ══════ SAVE ══════ */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveText}>💾  Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditRecommendationScreen;
