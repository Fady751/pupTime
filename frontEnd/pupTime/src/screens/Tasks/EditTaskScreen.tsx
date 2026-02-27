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

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_META: Record<string, { color: string; emoji: string }> = {
  none: { color: "#9CA3AF", emoji: "⚪" },
  low: { color: "#22C55E", emoji: "🟢" },
  medium: { color: "#F59E0B", emoji: "🟠" },
  high: { color: "#EF4444", emoji: "🔴" },
};

const WEEKDAY_SHORT: Record<string, string> = {
  MO: "Mo", TU: "Tu", WE: "We", TH: "Th", FR: "Fr", SA: "Sa", SU: "Su",
};
const WEEKDAY_KEYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

type RepFreq = "once" | "daily" | "weekly" | "monthly" | "yearly";
const REP_OPTIONS: RepFreq[] = ["once", "daily", "weekly", "monthly", "yearly"];

const parseRRule = (rrule?: string | null): { freq: RepFreq | null; weekdays: string[] } => {
  if (!rrule) return { freq: null, weekdays: [] };
  const freqMatch = rrule.match(/FREQ=(\w+)/);
  const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
  return {
    freq: freqMatch ? (freqMatch[1].toLowerCase() as RepFreq) : null,
    weekdays: byDayMatch ? byDayMatch[1].split(",") : [],
  };
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

const EditTaskScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const user = useSelector((state: RootState) => state.user.data);
  const { tasks, update, remove } = useTasks(user?.id!);

  const taskId: string | undefined = route?.params?.taskId;
  const taskToEdit = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Form state ──
  const [title, setTitle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "none">("none");
  const [startDatetime, setStartDatetime] = useState<string>(new Date().toISOString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [repFreq, setRepFreq] = useState<RepFreq | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [reminder, setReminder] = useState<number | null>(null);
  const [reminderOptions, setReminderOptions] = useState<number[]>(DEFAULT_REMINDERS);
  const [customReminder, setCustomReminder] = useState("");
  const [emoji, setEmoji] = useState<string>("");
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [durationMinutes, setDurationMinutes] = useState<string>("");

  // ── Populate from task ──
  useEffect(() => {
    if (!taskToEdit) return;
    setTitle(taskToEdit.title ?? "");
    setPriority((taskToEdit.priority as any) ?? "none");
    setEmoji(taskToEdit.emoji ?? "");
    setReminder(taskToEdit.reminder_time ?? null);
    setDurationMinutes(taskToEdit.duration_minutes ? String(taskToEdit.duration_minutes) : "");
    setIsRecurring(taskToEdit.is_recurring ?? false);
    if (taskToEdit.start_datetime) setStartDatetime(taskToEdit.start_datetime);
    const { freq, weekdays } = parseRRule(taskToEdit.rrule);
    setRepFreq(freq);
    setSelectedWeekdays(weekdays);
    if (taskToEdit.categories) setSelectedCategories(taskToEdit.categories.map((c) => c.id));
    if (taskToEdit.reminder_time && !DEFAULT_REMINDERS.includes(taskToEdit.reminder_time)) {
      setReminderOptions([...DEFAULT_REMINDERS, taskToEdit.reminder_time].sort((a, b) => a - b));
    }
  }, [taskToEdit]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
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

  const handleDelete = () => {
    if (!taskToEdit) return;
    Alert.alert("Delete Task", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => { await remove(taskToEdit.id); navigation.goBack(); },
      },
    ]);
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Missing title", "Please enter a task title."); return; }
    if (!taskToEdit) return;
    setSaving(true);
    try {
      const rrule = buildRRule(repFreq, selectedWeekdays);
      const dur = Number(durationMinutes);
      const newDuration = Number.isFinite(dur) && dur > 0 ? dur : null;
      const newEmoji = emoji || null;
      const newStartDatetime = startDatetime;
      const newIsRecurring = !!rrule;
      const newCategories = selectedCategories
        .map((id) => categories.find((c) => c.id === id)!)
        .filter(Boolean);

      // Only include fields that actually changed
      const patch: Partial<TaskTemplate> = {};

      if (title.trim() !== (taskToEdit.title ?? "")) patch.title = title.trim();
      if (priority !== (taskToEdit.priority ?? "none")) patch.priority = priority;
      if (newEmoji !== (taskToEdit.emoji ?? null)) patch.emoji = newEmoji;
      if (newStartDatetime !== taskToEdit.start_datetime) patch.start_datetime = newStartDatetime;
      if (newIsRecurring !== (taskToEdit.is_recurring ?? false)) patch.is_recurring = newIsRecurring;
      if (rrule !== (taskToEdit.rrule ?? null)) patch.rrule = rrule;
      if (reminder !== (taskToEdit.reminder_time ?? null)) patch.reminder_time = reminder;
      if (newDuration !== (taskToEdit.duration_minutes ?? null)) patch.duration_minutes = newDuration;

      // Compare category IDs
      const oldCatIds = (taskToEdit.categories ?? []).map((c) => c.id).sort().join(",");
      const newCatIds = selectedCategories.sort().join(",");
      if (oldCatIds !== newCatIds) patch.categories = newCategories;

      // Nothing changed → just go back
      if (Object.keys(patch).length === 0) {
        navigation.goBack();
        return;
      }

      patch.updated_at = new Date().toISOString();
      await update(taskToEdit.id, patch);
      navigation.goBack();
    } catch { Alert.alert("Error", "Failed to save changes."); }
    finally { setSaving(false); }
  };

  // ── Loading ──
  if (!taskToEdit) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.heroContainer}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>Edit Task</Text>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>←</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading task…</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Hero ────────────────────────────── */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Edit Task</Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {emoji ? `${emoji} ` : "📝 "}{taskToEdit.title}
            </Text>
          </View>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ══════ TITLE & EMOJI ══════ */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Task Name</Text>
          <View style={styles.titleInputContainer}>
            <Text style={styles.titleEmoji}>{emoji || "📌"}</Text>
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
          <Text style={styles.sectionLabel}>Priority</Text>
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
                    {meta.emoji} {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ══════ DATE & TIME ══════ */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Schedule</Text>
          <View style={styles.dateTimeRow}>
            <Pressable style={styles.dateTimeBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateTimeIcon}>📅</Text>
              <View>
                <Text style={styles.dateTimeLabel}>Date</Text>
                <Text style={styles.dateTimeText}>
                  {new Date(startDatetime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
            </Pressable>
            <Pressable style={styles.dateTimeBtn} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.dateTimeIcon}>⏰</Text>
              <View>
                <Text style={styles.dateTimeLabel}>Time</Text>
                <Text style={styles.dateTimeText}>
                  {new Date(startDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </Pressable>
          </View>
          {showDatePicker && (
            <DateTimePicker value={new Date(startDatetime)} mode="date" display="default" onChange={onDateChange} />
          )}
          {showTimePicker && (
            <DateTimePicker value={new Date(startDatetime)} mode="time" display="default" onChange={onTimeChange} />
          )}
        </View>

        {/* ══════ DURATION ══════ */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Duration</Text>
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
          <Text style={styles.sectionLabel}>Repeat</Text>
          <View style={styles.repRow}>
            <Pressable
              style={[styles.repChip, !repFreq && styles.repChipSelected]}
              onPress={() => { setRepFreq(null); setSelectedWeekdays([]); }}
            >
              <Text style={[styles.repChipText, !repFreq && styles.repChipTextSelected]}>None</Text>
            </Pressable>
            {REP_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.repChip, repFreq === opt && styles.repChipSelected]}
                onPress={() => { setRepFreq(opt === repFreq ? null : opt); if (opt !== "weekly") setSelectedWeekdays([]); }}
              >
                <Text style={[styles.repChipText, repFreq === opt && styles.repChipTextSelected]}>{opt}</Text>
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
            <Text style={styles.sectionLabel}>Categories</Text>
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
          <Text style={styles.sectionLabel}>Reminder (minutes before)</Text>
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
              placeholder="Custom…"
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

        {/* ══════ EMOJI ══════ */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Icon</Text>
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
          <View style={styles.emojiGrid}>
            {EMOJI_CATEGORIES.find((c) => c.id === selectedEmojiCategory)?.emojis.map((e) => (
              <Pressable key={e} style={[styles.emojiBtn, emoji === e && styles.emojiSelected]} onPress={() => setEmoji(emoji === e ? "" : e)}>
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ══════ ACTIONS ══════ */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.saveText}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Text style={styles.deleteBtnText}>🗑️  Delete Task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditTaskScreen;
