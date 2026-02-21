import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Task, isTaskOnDate, isTaskCompletedForDate } from "../../types/task";
import TaskCard from "../Task/TaskCard";
import createScheduleStyles, { PRIORITY_COLORS } from "./Schedule.styles";
import useTheme from "../../Hooks/useTheme";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SCREEN_WIDTH = Dimensions.get("window").width;

// Stable reference for today's date (resets only on component mount)
const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

type ScheduleProps = {
  tasks: Task[];
  onTaskPress?: (task: Task) => void;
  /** Called when user toggles a task's completion for a specific date */
  onCompleteToggle?: (taskId: string, date: Date) => void;
  /** Optional helper from parent to indicate a toggle is in progress for this task+date */
  isToggling?: (taskId: string, date: Date) => boolean;
};

type DayInfo = {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const Schedule: React.FC<ScheduleProps> = ({ tasks, onTaskPress, onCompleteToggle, isToggling }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createScheduleStyles(colors), [colors]);
  const today = useMemo(() => getTodayStart(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [pickerYear, setPickerYear] = useState(currentYear);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          goToNextMonth();
        } else if (gestureState.dx > 50) {
          goToPrevMonth();
        }
      },
    })
  ).current;

  const goToPrevMonth = useCallback(() => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth, slideAnim]);

  const goToNextMonth = useCallback(() => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth, slideAnim]);

  const calendarDays = useMemo((): DayInfo[][] => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);

    const days: DayInfo[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        tasks: tasks.filter((t) => isTaskOnDate(t, date)),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        tasks: tasks.filter((t) => isTaskOnDate(t, date)),
      });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        tasks: tasks.filter((t) => isTaskOnDate(t, date)),
      });
    }

    // Split into weeks
    const weeks: DayInfo[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return weeks;
  }, [currentYear, currentMonth, tasks, today]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((t) => {
      if(isTaskOnDate(t, selectedDate)) {
        console.log(`Task "${t.title}" is on selected date ${selectedDate.toDateString()}`);
      }
      return isTaskOnDate(t, selectedDate);
  });
  }, [selectedDate, tasks]);

  const handleDayPress = (dayInfo: DayInfo) => {
    setSelectedDate(dayInfo.date);
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
    onTaskPress?.(task);
  };

  const handleMonthSelect = (month: number) => {
    setCurrentMonth(month);
    setCurrentYear(pickerYear);
    setShowMonthPicker(false);
  };

  const formatSelectedDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const getTaskIndicatorColors = (dayTasks: Task[]): string[] => {
    const indicatorColors: string[] = [];
    const priorities = ["high", "medium", "low", "none"];
    
    for (const priority of priorities) {
      const hasTask = dayTasks.some((t) => t.priority === priority);
      if (hasTask && indicatorColors.length < 3) {
        indicatorColors.push(PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]);
      }
    }
    
    return indicatorColors;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Calendar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Schedule</Text>

        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <Pressable
            style={styles.navButton}
            onPress={goToPrevMonth}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
          >
            <Text style={styles.navButtonText}>←</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setPickerYear(currentYear);
              setShowMonthPicker(true);
            }}
            style={styles.monthYearContainer}
            accessibilityLabel="Select month and year"
            accessibilityRole="button"
          >
            <Text style={styles.monthText}>{MONTHS[currentMonth]}</Text>
            <Text style={styles.yearText}>{currentYear}</Text>
          </Pressable>

          <Pressable
            style={styles.navButton}
            onPress={goToNextMonth}
            accessibilityLabel="Next month"
            accessibilityRole="button"
          >
            <Text style={styles.navButtonText}>→</Text>
          </Pressable>
        </View>

        {/* Week Days Header */}
        <View style={styles.weekDays}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <Animated.View
          style={[
            styles.calendarGrid,
            { transform: [{ translateX: slideAnim }] },
          ]}
          {...panResponder.panHandlers}
        >
          {calendarDays.map((week, weekIdx) => (
            <View key={weekIdx} style={styles.weekRow}>
              {week.map((dayInfo, dayIdx) => {
                const isSelected =
                  selectedDate && isSameDay(dayInfo.date, selectedDate);
                const indicatorColors = getTaskIndicatorColors(dayInfo.tasks);

                return (
                  <Pressable
                    key={dayIdx}
                    style={[
                      styles.dayCell,
                      !dayInfo.isCurrentMonth && styles.dayCellOtherMonth,
                      dayInfo.isToday && !isSelected && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => handleDayPress(dayInfo)}
                    accessibilityLabel={`${dayInfo.day}, ${dayInfo.tasks.length} tasks`}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        dayInfo.isToday &&
                          !isSelected &&
                          styles.dayNumberToday,
                        isSelected && styles.dayNumberSelected,
                      ]}
                    >
                      {dayInfo.day}
                    </Text>

                    {indicatorColors.length > 0 && (
                      <View style={styles.taskIndicators}>
                        {indicatorColors.map((color, idx) => (
                          <View
                            key={idx}
                            style={[styles.taskDot, { backgroundColor: color }]}
                          />
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Tasks List */}
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {selectedDate ? formatSelectedDate(selectedDate) : "Select a day"}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {selectedDayTasks.length > 0
                ? "Tap a task to view details"
                : "No tasks scheduled"}
            </Text>
          </View>

          {selectedDayTasks.length > 0 && (
            <View style={styles.taskCount}>
              <Text style={styles.taskCountText}>
                {selectedDayTasks.length} task
                {selectedDayTasks.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.tasksList}
          showsVerticalScrollIndicator={false}
        >
          {selectedDayTasks.length > 0 ? (
            selectedDayTasks.map((task) => {
              const taskDate = selectedDate ?? task.startTime;
              const completed = isTaskCompletedForDate(task, taskDate);
              return (
                <View key={task.id} style={styles.taskRow}>
                  <View style={styles.taskRowCard}>
                    <TaskCard
                      day={taskDate}
                      task={task}
                      compact
                      onPress={handleTaskPress}
                    />
                  </View>
                  {onCompleteToggle && (() => {
                    const isFuture = taskDate > new Date(new Date().setHours(23, 59, 59, 999));
                    const toggling = isToggling ? isToggling(task.id, taskDate) : false;
                    return (
                      <Pressable
                        style={[
                          styles.completeToggle,
                          completed && styles.completeToggleDone,
                          !completed && isFuture && styles.completeToggleDisabled,
                        ]}
                        onPress={() => onCompleteToggle(task.id, taskDate)}
                        disabled={(!completed && isFuture) || toggling}
                      >
                        <Text style={styles.completeToggleText}>
                          {toggling ? "..." : completed ? "✓" : isFuture ? "🔒" : "○"}
                        </Text>
                      </Pressable>
                    );
                  })()}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌤️</Text>
              <Text style={styles.emptyTitle}>No tasks today</Text>
              <Text style={styles.emptySubtitle}>
                Enjoy your free time or add a new task to stay productive!
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Month Picker Modal */}
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
                accessibilityLabel="Previous year"
              >
                <Text style={styles.yearNavText}>←</Text>
              </Pressable>

              <Text style={styles.yearNavTitle}>{pickerYear}</Text>

              <Pressable
                style={styles.yearNavButton}
                onPress={() => setPickerYear((y) => y + 1)}
                accessibilityLabel="Next year"
              >
                <Text style={styles.yearNavText}>→</Text>
              </Pressable>
            </View>

            <View style={styles.monthsGrid}>
              {MONTHS.map((month, idx) => {
                const isSelected =
                  idx === currentMonth && pickerYear === currentYear;
                const isCurrent =
                  idx === today.getMonth() && pickerYear === today.getFullYear();

                return (
                  <Pressable
                    key={month}
                    style={[
                      styles.monthPickerItem,
                      isSelected && styles.monthPickerItemSelected,
                      isCurrent && !isSelected && styles.monthPickerItemCurrent,
                    ]}
                    onPress={() => handleMonthSelect(idx)}
                    accessibilityLabel={`Select ${month} ${pickerYear}`}
                  >
                    <Text
                      style={[
                        styles.monthPickerItemText,
                        isSelected && styles.monthPickerItemTextSelected,
                        isCurrent &&
                          !isSelected &&
                          styles.monthPickerItemTextCurrent,
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

      {/* Task Detail Modal */}
      <Modal
        visible={showTaskDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTaskDetail(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTaskDetail(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task Details</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowTaskDetail(false)}
                accessibilityLabel="Close task details"
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedTask && (
                <TaskCard
                  task={selectedTask}
                  day={selectedDate ?? selectedTask.startTime}
                />
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default Schedule;
