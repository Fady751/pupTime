import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { createStyles } from "./styles";
import { getCategories } from "../../services/interestService/getCategories";
import { Category } from "../../types/category";
import {
  PRIORITIES,
  DEFAULT_REMINDERS,
  EMOJI_CATEGORIES,
} from "../../constants/taskConstants";
import useTheme from "../../Hooks/useTheme";
import { useTasks } from "../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import type { TaskTemplate } from "../../types/task";
import { getCurrentTimezone } from "../../types/task";
import { getAllLocalCategories } from "../../services/TaskService/syncService";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_META: Record<string, { color: string; emoji: string; label: string }> = {
  low:    { color: "#22C55E", emoji: "🟢", label: "Low" },
  medium: { color: "#F59E0B", emoji: "🟠", label: "Medium" },
  high:   { color: "#EF4444", emoji: "🔴", label: "High" },
};

const WEEKDAY_SHORT: Record<string, string> = {
  MO: "Mo", TU: "Tu", WE: "We", TH: "Th", FR: "Fr", SA: "Sa", SU: "Su",
};
const WEEKDAY_KEYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

type RepFreq = "once" | "daily" | "weekly" | "monthly" | "yearly";
const REP_OPTIONS: RepFreq[] = ["once", "daily", "weekly", "monthly", "yearly"];

const REP_META: Record<RepFreq, { emoji: string; label: string }> = {
  once:    { emoji: "1️⃣", label: "Once" },
  daily:   { emoji: "📆", label: "Daily" },
  weekly:  { emoji: "📅", label: "Weekly" },
  monthly: { emoji: "🗓️", label: "Monthly" },
  yearly:  { emoji: "🎂", label: "Yearly" },
};

const buildRRule = (freq: RepFreq | null, weekdays: string[]): string | null => {
  if (!freq || freq === "once") return null;
  let rule = `FREQ=${freq.toUpperCase()}`;
  if (freq === "weekly" && weekdays.length > 0) rule += `;BYDAY=${weekdays.join(",")}`;
  return rule;
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

type Props = { route?: any; navigation?: any };

const AddTaskScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const user = useSelector((state: RootState) => state.user.data);
  const { create } = useTasks(user?.id!);

  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Form state ──
  const [title, setTitle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("low");
  const [startDatetime, setStartDatetime] = useState<string>(new Date().toISOString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repFreq, setRepFreq] = useState<RepFreq>("once");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [reminder, setReminder] = useState<number | null>(null);
  const [reminderOptions, setReminderOptions] = useState<number[]>(DEFAULT_REMINDERS);
  const [customReminder, setCustomReminder] = useState("");
  const [emoji, setEmoji] = useState<string>("");
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [durationMinutes, setDurationMinutes] = useState<string>("");

  // Fetch categories
  useEffect(() => {
    getAllLocalCategories().then(setCategories).catch(() => {});
    setEmoji(EMOJI_CATEGORIES[0].emojis[0]);
  }, []);

  // ── Handlers ──
  const toggleCategory = useCallback((id: number) => {
    setSelectedCategories((p) => (p.includes(id) ? p.filter((c) => c !== id) : [...p, id]));
  }, []);

  const toggleWeekday = useCallback((day: string) => {
    setSelectedWeekdays((p) => (p.includes(day) ? p.filter((d) => d !== day) : [...p, day]));
  }, []);

  const onDateChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowDatePicker(false);
    if (_e.type === "dismissed" || !d) return;
    const u = new Date(startDatetime);
    u.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setStartDatetime(u.toISOString());
  };

  const onTimeChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowTimePicker(false);
    if (_e.type === "dismissed" || !d) return;
    const u = new Date(startDatetime);
    u.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setStartDatetime(u.toISOString());
  };

  const handleAddCustomReminder = () => {
    const v = Number(customReminder);
    if (!Number.isFinite(v) || v <= 0) return;
    setReminderOptions((p) => Array.from(new Set([...p, v])).sort((a, b) => a - b));
    setReminder(v);
    setCustomReminder("");
  };

  const handleSave = async () => {
    // ── Validate all required fields ──
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a task title.");
      return;
    }
    if (!emoji) {
      Alert.alert("Missing Icon", "Please select an icon for your task.");
      return;
    }
    const dur = Number(durationMinutes);
    if (!Number.isFinite(dur) || dur <= 0) {
      Alert.alert("Missing Duration", "Please enter a valid duration in minutes.");
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const rrule = buildRRule(repFreq, selectedWeekdays);
      const nowIso = new Date().toISOString();

      const task: TaskTemplate = {
        id: "", // will be generated by syncService
        user_id: user.id,
        title: title.trim(),
        priority,
        emoji: emoji,
        start_datetime: startDatetime,
        is_recurring: !!rrule,
        rrule: rrule,
        reminder_time: reminder,
        duration_minutes: dur,
        timezone: getCurrentTimezone(),
        is_deleted: false,
        created_at: nowIso,
        updated_at: nowIso,
        categories: selectedCategories
          .map((id) => categories.find((c) => c.id === id)!)
          .filter(Boolean),
        overrides: [],
      };

      await create(task);
      navigation.goBack();
    } catch (err) {
      console.error("[AddTask] save failed", err);
      Alert.alert("Error", "Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  const displayDate = new Date(startDatetime);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Hero ────────────────────────────── */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.heroTitle}>New Task</Text>
            <Text style={styles.heroSubtitle}>
              {emoji ? `${emoji} ` : "✨ "}Create something awesome
            </Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ══════ ICON (moved up for visual impact) ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🎨</Text>
            <Text style={styles.sectionLabel}>Icon *</Text>
          </View>
          {emoji ? (
            <View style={styles.selectedEmojiPreview}>
              <Text style={styles.selectedEmojiLarge}>{emoji}</Text>
              <Pressable style={styles.clearEmojiBtn} onPress={() => setEmoji("")}>
                <Text style={styles.clearEmojiBtnText}>✕</Text>
              </Pressable>
            </View>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.emojiTabsRow}>
              {EMOJI_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[styles.emojiTab, selectedEmojiCategory === cat.id && styles.emojiTabActive]}
                  onPress={() => setSelectedEmojiCategory(cat.id)}
                >
                  <Text style={[styles.emojiTabText, selectedEmojiCategory === cat.id && styles.emojiTabTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.emojiGrid}>
            {EMOJI_CATEGORIES.find((c) => c.id === selectedEmojiCategory)?.emojis.map((e) => (
              <Pressable key={e} style={[styles.emojiBtn, emoji === e && styles.emojiSelected]} onPress={() => setEmoji(emoji === e ? "" : e)}>
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ══════ TITLE ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>✏️</Text>
            <Text style={styles.sectionLabel}>Task Name *</Text>
          </View>
          <View style={styles.titleInputContainer}>
            <Text style={styles.titleEmoji}>{emoji || "⭐"}</Text>
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
            {PRIORITIES.map((p) => {
              const meta = PRIORITY_META[p];
              const active = priority === p;
              return (
                <Pressable
                  key={p}
                  style={[
                    styles.priorityChip,
                    active && styles.priorityChipSelected,
                    active && { borderColor: meta.color, backgroundColor: meta.color + "18" },
                  ]}
                  onPress={() => setPriority(p as any)}
                >
                  <Text style={[styles.priorityChipText, { color: active ? meta.color : colors.secondaryText }]}>
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
            <Pressable style={styles.dateTimeBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateTimeIcon}>📅</Text>
              <View>
                <Text style={styles.dateTimeLabel}>Date</Text>
                <Text style={styles.dateTimeText}>
                  {displayDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
            </Pressable>
            <Pressable style={styles.dateTimeBtn} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.dateTimeIcon}>⏰</Text>
              <View>
                <Text style={styles.dateTimeLabel}>Time</Text>
                <Text style={styles.dateTimeText}>
                  {displayDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </Pressable>
          </View>
          {showDatePicker && (
            <DateTimePicker value={displayDate} mode="date" display="default" onChange={onDateChange} />
          )}
          {showTimePicker && (
            <DateTimePicker value={displayDate} mode="time" display="default" onChange={onTimeChange} />
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

        {/* ══════ REPETITION ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔁</Text>
            <Text style={styles.sectionLabel}>Repeat</Text>
          </View>
          <View style={styles.repRow}>
            {REP_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.repChip, repFreq === opt && styles.repChipSelected]}
                onPress={() => { setRepFreq(opt); if (opt !== "weekly") setSelectedWeekdays([]); }}
              >
                <Text style={[styles.repChipText, repFreq === opt && styles.repChipTextSelected]}>
                  {REP_META[opt].emoji} {REP_META[opt].label}
                </Text>
              </Pressable>
            ))}
          </View>

          {repFreq === "weekly" && (
            <View style={styles.weekdayRow}>
              {WEEKDAY_KEYS.map((day) => {
                const on = selectedWeekdays.includes(day);
                return (
                  <Pressable key={day} style={[styles.weekdayChip, on && styles.weekdayChipSelected]} onPress={() => toggleWeekday(day)}>
                    <Text style={[styles.weekdayChipText, on && styles.weekdayChipTextSelected]}>{WEEKDAY_SHORT[day]}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ══════ CATEGORIES ══════ */}
        {categories.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🏷️</Text>
              <Text style={styles.sectionLabel}>Categories</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoriesScrollContent}>
              {categories.map((cat) => {
                const on = selectedCategories.includes(cat.id);
                return (
                  <Pressable key={cat.id} style={[styles.categoryChip, on && styles.categoryChipSelected]} onPress={() => toggleCategory(cat.id)}>
                    <Text style={[styles.categoryChipText, on && styles.categoryChipTextSelected]}>{cat.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ══════ REMINDER ══════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔔</Text>
            <Text style={styles.sectionLabel}>Reminder</Text>
          </View>
          <View style={styles.reminderRow}>
            {reminderOptions.map((r) => {
              const on = reminder === r;
              return (
                <Pressable key={r} style={[styles.reminderChip, on && styles.reminderChipSelected]} onPress={() => setReminder(on ? null : r)}>
                  <Text style={[styles.reminderChipText, on && styles.reminderChipTextSelected]}>{r} min</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.customReminderRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Custom minutes…"
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
              value={customReminder}
              onChangeText={setCustomReminder}
            />
            <TouchableOpacity style={styles.customAddBtn} onPress={handleAddCustomReminder}>
              <Text style={styles.customAddBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════ SAVE ══════ */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.saveText}>🚀  Create Task</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddTaskScreen;
