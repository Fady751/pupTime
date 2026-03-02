import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { createStyles } from "./Tasks.styles";
import { useNavigation } from "@react-navigation/native";
import useTheme from "../../Hooks/useTheme";
import { useTasks } from "../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { BottomBar } from "../../components/BottomBar/BottomBar";
import {
  type TaskTemplate,
  type TaskOverride,
  toLocalDateString,
} from "../../types/task";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
  none: "#9CA3AF",
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#22C55E",
  SKIPPED: "#9CA3AF",
  RESCHEDULED: "#8B5CF6",
  PENDING: "#F59E0B",
};

type StatusFilter = "all" | "PENDING" | "COMPLETED";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
};

/** Flatten templates → overrides that fall on a specific date string (YYYY-MM-DD). */
const getOverridesForDate = (
  tasks: TaskTemplate[],
  dateStr: string,
): { template: TaskTemplate; override: TaskOverride }[] => {
  const result: { template: TaskTemplate; override: TaskOverride }[] = [];
  for (const tpl of tasks) {
    if (tpl.is_deleted) continue;
    for (const ov of tpl.overrides ?? []) {
      if (ov.is_deleted) continue;
      const ovDate = toLocalDateString(ov.instance_datetime, tpl.timezone ?? undefined);
      if (ovDate === dateStr) {
        result.push({ template: tpl, override: ov });
      }
    }
  }
  // Sort by time
  result.sort((a, b) => new Date(a.override.instance_datetime).getTime() - new Date(b.override.instance_datetime).getTime());
  return result;
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

const TasksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useSelector((state: RootState) => state.user.data);
  const userId = user?.id;

  const { tasks, loading, filter, changeOverride, applyFilter } = useTasks(userId!);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [togglingIds, setTogglingIds] = useState<string[]>([]);

  const dateStr = useMemo(() => toLocalDateString(selectedDate.toISOString()), [selectedDate]);
  const nextDateStr = useMemo(() => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    return toLocalDateString(next.toISOString());
  }, [selectedDate]);

  // Apply date filter whenever selected date changes
  useEffect(() => {
    applyFilter({
      ...filter,
      start_date: dateStr,
      end_date: nextDateStr,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  /* ── Date navigation ─────────────────────────── */
  const goToPrevDay = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => setSelectedDate(new Date()), []);

  /* ── Filtered overrides ──────────────────────── */
  const todayOverrides = useMemo(
    () => (userId ? getOverridesForDate(tasks, dateStr) : []),
    [tasks, dateStr, userId],
  );

  const filteredOverrides = useMemo(() => {
    if (statusFilter === "all") return todayOverrides;
    return todayOverrides.filter((o) => o.override.status === statusFilter);
  }, [todayOverrides, statusFilter]);

  const pendingCount = useMemo(
    () => todayOverrides.filter((o) => o.override.status === "PENDING").length,
    [todayOverrides],
  );
  const completedCount = useMemo(
    () => todayOverrides.filter((o) => o.override.status === "COMPLETED").length,
    [todayOverrides],
  );

  /* ── Toggle complete ─────────────────────────── */
  const toggleComplete = useCallback(
    async (templateId: string, override: TaskOverride) => {
      if (togglingIds.includes(override.id)) return;

      const isCompleted = override.status === "COMPLETED";

      setTogglingIds((prev) => [...prev, override.id]);
      try {
        await changeOverride(templateId, override.id, {
          status: isCompleted ? "PENDING" : "COMPLETED",
        });
      } finally {
        setTogglingIds((prev) => prev.filter((id) => id !== override.id));
      }
    },
    [togglingIds, changeOverride],
  );

  /* ── Delete ──────────────────────────────────── */
  const handleDelete = useCallback(
    (templateId: string, overrideId: string) => {
      Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await changeOverride(templateId, overrideId, { status: "SKIPPED" });
          },
        },
      ]);
    },
    [changeOverride],
  );

  /* ── Date display ────────────────────────────── */
  const dayLabel = selectedDate.toLocaleDateString(undefined, { weekday: "long" });
  const fullDateLabel = selectedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const isTodaySelected = isToday(selectedDate);

  /* ── Render helpers ──────────────────────────── */

  const renderRightActions = (templateId: string, overrideId: string) => (
    <TouchableOpacity
      style={styles.deleteBox}
      onPress={() => handleDelete(templateId, overrideId)}
    >
      <Text style={styles.deleteIcon}>🗑️</Text>
      <Text style={styles.deleteText}>Skip</Text>
    </TouchableOpacity>
  );

  type OverrideItem = { template: TaskTemplate; override: TaskOverride };

  const renderItem = ({ item }: { item: OverrideItem }) => {
    const { template, override } = item;
    const isCompleted = override.status === "COMPLETED";
    const isSkipped = override.status === "SKIPPED";
    const isDone = isCompleted || isSkipped;
    const isToggling = togglingIds.includes(override.id);
    const priorityColor = PRIORITY_COLORS[template.priority ?? "none"] ?? PRIORITY_COLORS.none;

    const getStatusBtnStyle = () => {
      if (isCompleted) return styles.statusBtnCompleted;
      if (isSkipped) return styles.statusBtnSkipped;
      return styles.statusBtnPending;
    };

    const getStatusTextStyle = () => {
      if (isCompleted) return styles.statusBtnTextCompleted;
      if (isSkipped) return styles.statusBtnTextSkipped;
      return styles.statusBtnTextPending;
    };

    const getStatusLabel = () => {
      if (isToggling) return "•••";
      if (isCompleted) return "✓ Done";
      if (isSkipped) return "Skipped";
      return "Mark ✓";
    };

    return (
      <Swipeable renderRightActions={() => renderRightActions(template.id, override.id)}>
        <Pressable
          style={[styles.taskCard, { borderLeftColor: priorityColor }]}
          onPress={() => navigation.navigate("EditTask", { taskId: template.id })}
        >
          <Text style={styles.taskEmoji}>{template.emoji || "📌"}</Text>
          <View style={styles.taskContent}>
            <Text
              style={[styles.taskTitle, isDone && styles.taskTitleDone]}
              numberOfLines={1}
            >
              {template.title}
            </Text>
            <Text style={styles.taskMeta}>
              {formatTime(override.instance_datetime)} •{" "}
              {(template.priority ?? "none").charAt(0).toUpperCase() +
                (template.priority ?? "none").slice(1)}{" "}
              priority
            </Text>
            {template.duration_minutes ? (
              <Text style={styles.taskDuration}>
                ⏱ {template.duration_minutes} min
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.statusBtn, getStatusBtnStyle()]}
            onPress={() => toggleComplete(template.id, override)}
            disabled={isToggling || isSkipped}
          >
            <Text style={[styles.statusBtnText, getStatusTextStyle()]}>
              {getStatusLabel()}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ========== HERO ========== */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroTitle}>My Tasks</Text>
            <Text style={styles.heroSubtitle}>Stay organized, stay ahead</Text>
          </View>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayOverrides.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>
      </View>

      {/* ========== DATE SELECTOR ========== */}
      <View style={styles.dateSelector}>
        <View style={styles.dateSelectorCard}>
          <Pressable style={styles.dateNavBtn} onPress={goToPrevDay}>
            <Text style={styles.dateNavBtnText}>‹</Text>
          </Pressable>

          <Pressable style={styles.dateLabelContainer} onPress={goToToday}>
            <Text style={styles.dateLabelDay}>{dayLabel}</Text>
            <Text style={styles.dateLabelFull}>{fullDateLabel}</Text>
            {isTodaySelected && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
            )}
          </Pressable>

          <Pressable style={styles.dateNavBtn} onPress={goToNextDay}>
            <Text style={styles.dateNavBtnText}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* ========== FILTER TABS ========== */}
      <View style={styles.filterTabsContainer}>
        <View style={styles.filterTabs}>
          {(
            [
              { key: "all", label: "All", count: todayOverrides.length },
              { key: "PENDING", label: "Pending", count: pendingCount },
              { key: "COMPLETED", label: "Done", count: completedCount },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setStatusFilter(tab.key as StatusFilter)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label} ({tab.count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ========== TASK LIST ========== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {statusFilter === "all"
              ? "All Tasks"
              : statusFilter === "PENDING"
              ? "Pending Tasks"
              : "Completed Tasks"}
          </Text>
          <Text style={styles.sectionCount}>
            {filteredOverrides.length} task{filteredOverrides.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.section, { flex: 1 }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredOverrides}
          keyExtractor={(item) => item.override.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 160,
            ...(filteredOverrides.length === 0 && {
              flexGrow: 1,
              justifyContent: "center" as const,
            }),
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>
                {statusFilter === "COMPLETED" ? "🎉" : "🗓️"}
              </Text>
              <Text style={styles.emptyTitle}>
                {statusFilter === "COMPLETED"
                  ? "No completed tasks yet"
                  : "Your schedule is clear"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter === "COMPLETED"
                  ? "Mark a task as done to see it here."
                  : "No tasks scheduled for this day. Tap the button below to create one."}
              </Text>
            </View>
          }
        />
      )}

      {/* ========== FAB — Add Task ========== */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("AddTask")}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* ========== BOTTOM BAR ========== */}
      <BottomBar current="Tasks" navigation={navigation} />
    </SafeAreaView>
  );
};

export default TasksScreen;