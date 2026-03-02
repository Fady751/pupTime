import React, { useState, useRef, useMemo, useCallback, useEffect, memo } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type TaskTemplate,
  type TaskOverride,
  toLocalDateString,
} from "../../types/task";
import createScheduleStyles, { PRIORITY_COLORS } from "./Schedule.styles";
import useTheme from "../../Hooks/useTheme";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SCREEN_WIDTH = Dimensions.get("window").width;

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#22C55E",
  SKIPPED: "#9CA3AF",
  RESCHEDULED: "#8B5CF6",
  PENDING: "#F59E0B",
};

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type OverrideItem = { template: TaskTemplate; override: TaskOverride };

type ScheduleProps = {
  tasks: TaskTemplate[];
  /** Called on mount AND whenever the visible month changes. */
  onMonthChange?: (startDate: string, endDate: string) => void;
  onTaskPress?: (template: TaskTemplate) => void;
  onCompleteToggle?: (
    templateId: string,
    overrideId: string,
    currentStatus: string,
  ) => void;
  isToggling?: (overrideId: string) => boolean;
  loading?: boolean;
};

type DayData = {
  key: string;
  date: Date;
  dateStr: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

/* ═══════════════════════════════════════════════════════════
   PURE HELPERS (zero allocations where possible)
   ═══════════════════════════════════════════════════════════ */

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ap}`;
};

/** Visible date range for the 42-cell calendar grid. */
const getVisibleRange = (year: number, month: number) => {
  const firstDow = getFirstDayOfMonth(year, month);
  const dim = getDaysInMonth(year, month);
  const start = new Date(year, month, 1 - firstDow);
  const end = new Date(year, month + 1, 42 - firstDow - dim);
  return {
    startDate: toLocalDateString(start.toISOString()),
    endDate: toLocalDateString(end.toISOString()),
  };
};

/* ═══════════════════════════════════════════════════════════
   MEMOISED SUB-COMPONENTS (prevent re-renders)
   ═══════════════════════════════════════════════════════════ */

type DayCellProps = {
  data: DayData;
  isSelected: boolean;
  dotColors: string[];
  onPress: (d: DayData) => void;
  styles: ReturnType<typeof createScheduleStyles>;
};

/** Each calendar cell is its own memo component.
 *  Only re-renders when its own props actually change. */
const DayCell = memo<DayCellProps>(({ data, isSelected, dotColors, onPress, styles }) => (
  <Pressable
    style={[
      styles.dayCell,
      !data.isCurrentMonth && styles.dayCellOtherMonth,
      data.isToday && !isSelected && styles.dayCellToday,
      isSelected && styles.dayCellSelected,
    ]}
    onPress={() => onPress(data)}
  >
    <Text
      style={[
        styles.dayNumber,
        data.isToday && !isSelected && styles.dayNumberToday,
        isSelected && styles.dayNumberSelected,
      ]}
    >
      {data.day}
    </Text>
    {dotColors.length > 0 && (
      <View style={styles.taskIndicators}>
        {dotColors.map((c, i) => (
          <View key={i} style={[styles.taskDot, { backgroundColor: c }]} />
        ))}
      </View>
    )}
  </Pressable>
));

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

const Schedule: React.FC<ScheduleProps> = ({
  tasks,
  onMonthChange,
  onTaskPress,
  onCompleteToggle,
  isToggling,
  loading,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createScheduleStyles(colors), [colors]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  const slideAnim = useRef(new Animated.Value(0)).current;

  /* ── Notify parent of visible range whenever month changes ── */
  useEffect(() => {
    if (!onMonthChange) return;
    const { startDate, endDate } = getVisibleRange(currentYear, currentMonth);
    onMonthChange(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear]);

  const isTodayMonth =
    currentMonth === today.getMonth() && currentYear === today.getFullYear();

  /* ── Gestures ─────────────────────────────────────── */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) goToNextMonth();
        else if (g.dx > 50) goToPrevMonth();
      },
    }),
  ).current;

  const animateSlide = useCallback(
    (direction: number) => {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: direction * SCREEN_WIDTH,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [slideAnim],
  );

  const goToPrevMonth = useCallback(() => {
    animateSlide(1);
    setCurrentMonth((m) => (m === 0 ? 11 : m - 1));
    setCurrentYear((y) => (currentMonth === 0 ? y - 1 : y));
  }, [animateSlide, currentMonth]);

  const goToNextMonth = useCallback(() => {
    animateSlide(-1);
    setCurrentMonth((m) => (m === 11 ? 0 : m + 1));
    setCurrentYear((y) => (currentMonth === 11 ? y + 1 : y));
  }, [animateSlide, currentMonth]);

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date().getMonth());
    setCurrentYear(new Date().getFullYear());
    setSelectedDate(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, []);

  /* ═══════════════════════════════════════════════════════
     PERFORMANCE: Pre-build date → OverrideItem[] lookup.
     Built ONCE when `tasks` ref changes.
     Each of 42 cells then does an O(1) Map.get().
     ═══════════════════════════════════════════════════════ */
  const overridesByDate = useMemo(() => {
    const map = new Map<string, OverrideItem[]>();
    for (const tpl of tasks) {
      if (tpl.is_deleted) continue;
      for (const ov of tpl.overrides ?? []) {
        if (ov.is_deleted) continue;
        const ds = toLocalDateString(ov.instance_datetime, tpl.timezone ?? undefined);
        let arr = map.get(ds);
        if (!arr) {
          arr = [];
          map.set(ds, arr);
        }
        arr.push({ template: tpl, override: ov });
      }
    }
    // Sort each bucket by time once
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.override.instance_datetime).getTime() -
          new Date(b.override.instance_datetime).getTime(),
      );
    }
    return map;
  }, [tasks]);

  /* ── 42-cell grid data (cheap: just builds DayData[]) ── */
  const calendarDays = useMemo((): DayData[][] => {
    const dim = getDaysInMonth(currentYear, currentMonth);
    const fow = getFirstDayOfMonth(currentYear, currentMonth);
    const prevDim = getDaysInMonth(currentYear, currentMonth - 1);
    const days: DayData[] = [];

    // Previous month tail
    for (let i = fow - 1; i >= 0; i--) {
      const day = prevDim - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      days.push({
        key: `p${day}`,
        date, day,
        dateStr: toLocalDateString(date.toISOString()),
        isCurrentMonth: false,
        isToday: sameDay(date, today),
      });
    }
    // Current month
    for (let day = 1; day <= dim; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push({
        key: `c${day}`,
        date, day,
        dateStr: toLocalDateString(date.toISOString()),
        isCurrentMonth: true,
        isToday: sameDay(date, today),
      });
    }
    // Next month head
    const rem = 42 - days.length;
    for (let day = 1; day <= rem; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      days.push({
        key: `n${day}`,
        date, day,
        dateStr: toLocalDateString(date.toISOString()),
        isCurrentMonth: false,
        isToday: sameDay(date, today),
      });
    }

    const weeks: DayData[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  }, [currentYear, currentMonth, today]);

  /* ── Dot colors per date (O(1) lookup) ─────────── */
  const dotColorsForDate = useCallback(
    (dateStr: string): string[] => {
      const items = overridesByDate.get(dateStr);
      if (!items || items.length === 0) return [];
      const out: string[] = [];
      for (const p of ["high", "medium", "low", "none"] as const) {
        if (items.some((o) => o.template.priority === p) && out.length < 3)
          out.push(PRIORITY_COLORS[p]);
      }
      return out;
    },
    [overridesByDate],
  );

  /* ── Selected day data ─────────────────────────── */
  const selectedDateStr = useMemo(
    () => toLocalDateString(selectedDate.toISOString()),
    [selectedDate],
  );

  const selectedOverrides = useMemo(
    () => overridesByDate.get(selectedDateStr) ?? [],
    [selectedDateStr, overridesByDate],
  );

  const pendingCount = useMemo(
    () => selectedOverrides.filter((o) => o.override.status === "PENDING").length,
    [selectedOverrides],
  );
  const doneCount = useMemo(
    () => selectedOverrides.filter((o) => o.override.status === "COMPLETED").length,
    [selectedOverrides],
  );

  const handleDayPress = useCallback((d: DayData) => setSelectedDate(d.date), []);

  const handleMonthSelect = useCallback(
    (month: number) => {
      setCurrentMonth(month);
      setCurrentYear(pickerYear);
      setShowMonthPicker(false);
    },
    [pickerYear],
  );

  const fmtSelectedDate = useMemo(
    () =>
      selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [selectedDate],
  );

  /* ── Task list item renderer (for FlatList) ────── */
  const renderTask = useCallback(
    ({ item }: { item: OverrideItem }) => {
      const { template, override } = item;
      const done = override.status === "COMPLETED";
      const skipped = override.status === "SKIPPED";
      const isDone = done || skipped;
      const pColor =
        PRIORITY_COLORS[(template.priority ?? "none") as keyof typeof PRIORITY_COLORS] ??
        PRIORITY_COLORS.none;
      const sColor = override.status ? STATUS_COLORS[override.status] : STATUS_COLORS.PENDING;
      const toggling = isToggling ? isToggling(override.id) : false;

      return (
        <View style={styles.taskRow}>
          <Pressable
            style={[styles.taskRowCard, taskItemStyles.card, { borderLeftColor: pColor }]}
            onPress={() => onTaskPress?.(template)}
          >
            <Text style={taskItemStyles.emoji}>{template.emoji || "📌"}</Text>

            <View style={taskItemStyles.middle}>
              <Text
                numberOfLines={1}
                style={[
                  taskItemStyles.title,
                  { color: colors.text },
                  isDone && taskItemStyles.titleDone,
                  isDone && { color: colors.secondaryText },
                ]}
              >
                {template.title}
              </Text>
              <Text style={[taskItemStyles.meta, { color: colors.secondaryText }]}>
                {fmtTime(override.instance_datetime)} •{" "}
                {(template.priority ?? "none").charAt(0).toUpperCase() +
                  (template.priority ?? "none").slice(1)}{" "}
                priority
              </Text>
            </View>

            <View
              style={[taskItemStyles.statusDot, { backgroundColor: sColor }]}
            />
          </Pressable>

          {onCompleteToggle && (
            <Pressable
              style={[
                styles.completeToggle,
                done && styles.completeToggleDone,
                skipped && styles.completeToggleDisabled,
              ]}
              onPress={() =>
                onCompleteToggle(template.id, override.id, override?.status ?? "PENDING")
              }
              disabled={toggling || skipped}
            >
              <Text style={styles.completeToggleText}>
                {toggling ? "…" : done ? "✓" : skipped ? "—" : "○"}
              </Text>
            </Pressable>
          )}
        </View>
      );
    },
    [colors, styles, isToggling, onTaskPress, onCompleteToggle],
  );

  const taskKeyExtractor = useCallback((item: OverrideItem) => item.override.id, []);

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <SafeAreaView style={styles.container}>
      {/* ========= CALENDAR HEADER ========= */}
      <View style={styles.header}>
        {/* Title row + Today pill */}
        <View style={headerRow}>
          <Text style={styles.headerTitle}>📅 Schedule</Text>
          {!isTodayMonth && (
            <Pressable onPress={goToToday} style={todayPill}>
              <Text style={todayPillText}>Today</Text>
            </Pressable>
          )}
        </View>

        {/* Month nav */}
        <View style={styles.monthNav}>
          <Pressable style={styles.navButton} onPress={goToPrevMonth}>
            <Text style={styles.navButtonText}>←</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPickerYear(currentYear);
              setShowMonthPicker(true);
            }}
            style={styles.monthYearContainer}
          >
            <Text style={styles.monthText}>{MONTHS[currentMonth]}</Text>
            <Text style={styles.yearText}>{currentYear}</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={goToNextMonth}>
            <Text style={styles.navButtonText}>→</Text>
          </Pressable>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekDays}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={styles.weekDayText}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={calGridWrapper}>
          <Animated.View
            style={[styles.calendarGrid, { transform: [{ translateX: slideAnim }] }]}
            {...panResponder.panHandlers}
          >
            {calendarDays.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day) => (
                  <DayCell
                    key={day.key}
                    data={day}
                    isSelected={sameDay(day.date, selectedDate)}
                    dotColors={dotColorsForDate(day.dateStr)}
                    onPress={handleDayPress}
                    styles={styles}
                  />
                ))}
              </View>
            ))}
          </Animated.View>

          {/* Loading overlay */}
          {loading && (
            <View style={loadingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>
      </View>

      {/* ========= TASK LIST ========= */}
      <View style={styles.content}>
        {/* Section header with summary chips */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{fmtSelectedDate}</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedOverrides.length > 0
                ? `${pendingCount} pending · ${doneCount} done`
                : "No tasks scheduled"}
            </Text>
          </View>
          {selectedOverrides.length > 0 && (
            <View style={styles.taskCount}>
              <Text style={styles.taskCountText}>
                {selectedOverrides.length} task
                {selectedOverrides.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {/* FlatList is more performant than ScrollView for lists */}
        <FlatList
          data={selectedOverrides}
          keyExtractor={taskKeyExtractor}
          renderItem={renderTask}
          contentContainerStyle={[
            { paddingHorizontal: 20, paddingBottom: 120 },
            selectedOverrides.length === 0 && {
              flexGrow: 1,
              justifyContent: "center" as const,
            },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌤️</Text>
              <Text style={styles.emptyTitle}>No tasks scheduled</Text>
              <Text style={styles.emptySubtitle}>
                Enjoy your free time or tap + to add a new task!
              </Text>
            </View>
          }
        />
      </View>

      {/* ========= MONTH PICKER MODAL ========= */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable
          style={styles.monthPickerOverlay}
          onPress={() => setShowMonthPicker(false)}
        >
          <Pressable
            style={styles.monthPickerContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.monthPickerTitle}>Select Month</Text>

            <View style={styles.yearNavRow}>
              <Pressable
                style={styles.yearNavButton}
                onPress={() => setPickerYear((y) => y - 1)}
              >
                <Text style={styles.yearNavText}>←</Text>
              </Pressable>
              <Text style={styles.yearNavTitle}>{pickerYear}</Text>
              <Pressable
                style={styles.yearNavButton}
                onPress={() => setPickerYear((y) => y + 1)}
              >
                <Text style={styles.yearNavText}>→</Text>
              </Pressable>
            </View>

            <View style={styles.monthsGrid}>
              {MONTHS.map((month, idx) => {
                const sel = idx === currentMonth && pickerYear === currentYear;
                const cur =
                  idx === today.getMonth() && pickerYear === today.getFullYear();
                return (
                  <Pressable
                    key={month}
                    style={[
                      styles.monthPickerItem,
                      sel && styles.monthPickerItemSelected,
                      cur && !sel && styles.monthPickerItemCurrent,
                    ]}
                    onPress={() => handleMonthSelect(idx)}
                  >
                    <Text
                      style={[
                        styles.monthPickerItemText,
                        sel && styles.monthPickerItemTextSelected,
                        cur && !sel && styles.monthPickerItemTextCurrent,
                      ]}
                    >
                      {month.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.monthPickerClose}
              onPress={() => setShowMonthPicker(false)}
            >
              <Text style={styles.monthPickerCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

/* ═══════════════════════════════════════════════════════════
   STATIC STYLES (created once, never re-allocated)
   ═══════════════════════════════════════════════════════════ */

const headerRow: Pressable["props"]["style"] = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
};

const todayPill: Pressable["props"]["style"] = {
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 16,
  backgroundColor: "#4F46E5",
};

const todayPillText: Text["props"]["style"] = {
  color: "#FFF",
  fontSize: 13,
  fontWeight: "700",
};

const calGridWrapper: View["props"]["style"] = {
  position: "relative",
};

const loadingOverlay: View["props"]["style"] = {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(255,255,255,0.5)",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 14,
};

const taskItemStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  middle: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  titleDone: {
    textDecorationLine: "line-through",
  },
  meta: {
    fontSize: 12,
    marginTop: 3,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
});

export default Schedule;
