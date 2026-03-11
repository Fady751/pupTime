import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createStyles } from "./TemplateDetails.styles";
import useTheme from "../../../Hooks/useTheme";
import { useTasks } from "../../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import type { TaskTemplate } from "../../../types/task";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
  none: "#9CA3AF",
};

const FREQ_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const parseFrequency = (rrule?: string | null): string => {
  if (!rrule) return "Once (not recurring)";
  const match = rrule.match(/FREQ=(\w+)/);
  if (!match) return "Once";
  return FREQ_LABELS[match[1]] ?? match[1];
};

const parseWeekdays = (rrule?: string | null): string => {
  if (!rrule) return "";
  const match = rrule.match(/BYDAY=([A-Z,]+)/);
  if (!match) return "";
  return match[1].split(",").join(", ");
};

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

type Props = { route?: any; navigation?: any };

const TemplateDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useSelector((state: RootState) => state.user.data);

  const templateId: string | undefined = route?.params?.templateId;

  /* ── Fetch tasks filtered by this template ──── */
  const templateFilter = useMemo(
    () => (templateId ? { template_id: templateId } : undefined),
    [templateId]
  );

  const { tasks, loading, remove } = useTasks(user?.id!, templateFilter);

  /* ── Find the template from filtered results ── */
  const template = useMemo(
    () => tasks.find((t) => t.id === templateId),
    [tasks, templateId]
  );

  /* ── Overrides count ─────────────────────────── */
  const overridesCount = useMemo(() => {
    if (!template) return 0;
    return (template.overrides ?? []).filter((o) => !o.is_deleted).length;
  }, [template]);

  /* ── Delete handler ──────────────────────────── */
  const handleDelete = useCallback(() => {
    if (!template) return;
    Alert.alert(
      "Delete Template",
      `Are you sure you want to delete "${template.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await remove(template.id);
            navigation.goBack();
          },
        },
      ]
    );
  }, [template, remove, navigation]);

  /* ── View Overrides → navigate to Schedule ─── */
  const handleViewOverrides = useCallback(() => {
    if (!templateId) return;
    navigation.navigate("Schedule", { templateId });
  }, [templateId, navigation]);

  /* ── Loading state ──────────────────────────── */
  if (loading || !template) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.heroContainer}>
          <View style={styles.heroTopRow}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>←</Text>
            </Pressable>
            <Text style={styles.heroTitle}>Template Details</Text>
          </View>
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading template…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor =
    PRIORITY_COLORS[template.priority ?? "none"] ?? PRIORITY_COLORS.none;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Hero ────────────────────────────── */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.heroEmojiLarge}>{template.emoji || "📌"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {template.title}
            </Text>
            <Text style={styles.heroSubtitle}>Template Details</Text>
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
            <Text style={styles.detailValue}>{template.title}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🎨</Text>
            <Text style={styles.detailLabel}>Emoji</Text>
            <Text style={[styles.detailValue, { fontSize: 24 }]}>
              {template.emoji || "—"}
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
                {(template.priority ?? "none").toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailIcon}>⏱️</Text>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {template.duration_minutes
                ? `${template.duration_minutes} minutes`
                : "—"}
            </Text>
          </View>
        </View>

        {/* ══════ SCHEDULE ══════ */}
        <View style={styles.scheduleCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📅</Text>
            <Text style={styles.sectionLabel}>Schedule</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailLabel}>Start</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(template.start_datetime)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🔁</Text>
            <Text style={styles.detailLabel}>Frequency</Text>
            <Text style={styles.detailValue}>
              {template.is_recurring
                ? parseFrequency(template.rrule)
                : "Once (not recurring)"}
            </Text>
          </View>

          {template.is_recurring && parseWeekdays(template.rrule) ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📆</Text>
              <Text style={styles.detailLabel}>Days</Text>
              <Text style={styles.detailValue}>
                {parseWeekdays(template.rrule)}
              </Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🔔</Text>
            <Text style={styles.detailLabel}>Reminder</Text>
            <Text style={styles.detailValue}>
              {template.reminder_time
                ? `${template.reminder_time} min before`
                : "None"}
            </Text>
          </View>

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailIcon}>🌍</Text>
            <Text style={styles.detailLabel}>Timezone</Text>
            <Text style={styles.detailValue}>
              {template.timezone ?? "UTC"}
            </Text>
          </View>

          {/* ── View Overrides Button → Schedule ── */}
          <TouchableOpacity
            style={styles.viewOverridesBtn}
            onPress={handleViewOverrides}
            activeOpacity={0.85}
          >
            <Text style={styles.viewOverridesBtnText}>
              📊 View Overrides ({overridesCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ══════ CATEGORIES ══════ */}
        {(template.categories?.length ?? 0) > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🏷️</Text>
              <Text style={styles.sectionLabel}>Categories</Text>
            </View>
            <View style={styles.categoriesRow}>
              {template.categories!.map((cat) => (
                <View key={cat.id} style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{cat.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══════ ACTIONS ══════ */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              navigation.navigate("EditTask", { taskId: template.id })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.editBtnText}>✏️  Edit Template</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteBtnText}>🗑️  Delete Template</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TemplateDetailsScreen;
