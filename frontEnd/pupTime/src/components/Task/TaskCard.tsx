import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Task, RepetitionFrequency, isTaskCompletedForDate } from "../../types/task";
import createTaskCardStyles, { PRIORITY_COLORS } from "./TaskCard.styles";
import useTheme from "../../Hooks/useTheme";
import { WEEKDAY_OPTIONS } from "../../constants/taskConstants";

type TaskCardProps = {
  task: Task;
  onPress?: (task: Task) => void;
  compact?: boolean;
  day?: Date | null;
};

const getDayOfWeek = (date: Date | null): string => {
  if (!date) return "";
  const dayIndex = date.getDay();
  return WEEKDAY_OPTIONS[dayIndex].toLowerCase();
};

const getDayKey = (day: Date): string => {
  return getDayOfWeek(day);
};

// Get the time from the matching repetition entry (by day), or from startTime
const getTaskTime = (
  task: Task,
  day?: Date | null
): { hours?: number; minutes?: number; allDay: boolean } => {
  const dayKey = getDayKey(day ?? task.startTime);

  if (task.repetition && task.repetition.length > 0) {
    let dailyRep: typeof task.repetition[number] | null = null;

    for (const rep of task.repetition) {
      if (rep.frequency === dayKey) {
        if (!rep.time) return { allDay: true };
        const t = new Date(rep.time);
        return { hours: t.getHours(), minutes: t.getMinutes(), allDay: false };
      }

      if (!dailyRep && rep.frequency === "daily") {
        dailyRep = rep;
      }
    }

    if (dailyRep) {
      if (!dailyRep.time) return { allDay: true };
      const t = new Date(dailyRep.time);
      return { hours: t.getHours(), minutes: t.getMinutes(), allDay: false };
    }
  }

  const t = new Date(task.startTime);
  return { hours: t.getHours(), minutes: t.getMinutes(), allDay: false };
};

// Get a display date for the task (startTime date + repetition time hours/minutes)
const getDisplayDate = (task: Task, day?: Date | null): Date => {
  return day ? new Date(day) : new Date(task.startTime);
};

const getTaskBaseDate = (task: Task, day?: Date | null): Date | null => {
  const time = getTaskTime(task, day);
  if (time.allDay || time.hours == null || time.minutes == null) return null;

  const base = getDisplayDate(task, day ?? task.startTime);
  base.setHours(time.hours, time.minutes, 0, 0);
  return base;
};

const formatTime = (date: Date | null): string => {
  if (!date) return "All day";
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
};

const formatDate = (date: Date): string => {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  return d.toLocaleDateString("en-US", options);
};

const formatRepetitionLabel = (frequency: RepetitionFrequency): string => {
  switch (frequency) {
    case "once":
      return "Once";
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    case "sunday":
      return "Sun";
    case "monday":
      return "Mon";
    case "tuesday":
      return "Tue";
    case "wednesday":
      return "Wed";
    case "thursday":
      return "Thu";
    case "friday":
      return "Fri";
    case "saturday":
      return "Sat";
    default:
      return String(frequency).slice(0, 3);
  }
};

const getPriorityStyle = (priority: Task["priority"]) => {
  switch (priority) {
    case "high":
      return "priorityHigh" as const;
    case "medium":
      return "priorityMedium" as const;
    case "low":
      return "priorityLow" as const;
    default:
      return "priorityNone" as const;
  }
};

const getPriorityLabel = (priority: Task["priority"]): string => {
  switch (priority) {
    case "high":
      return "🔴 High";
    case "medium":
      return "🟠 Medium";
    case "low":
      return "🟢 Low";
    default:
      return "⚪ None";
  }
};

export const TaskCardCompact: React.FC<TaskCardProps> = ({
  task,
  onPress,
  day,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createTaskCardStyles(colors), [colors]);
  const handlePress = () => {
    onPress?.(task);
  };

  const baseDate = getTaskBaseDate(task, day);
  const isCompleted = isTaskCompletedForDate(task, day ?? task.startTime);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.compactContainer,
        styles[getPriorityStyle(task.priority)],
        { opacity: pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Task: ${task.title}`}
    >
      <Text style={styles.compactEmoji}>{task.emoji || "📌"}</Text>
      <View style={styles.compactContent}>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={styles.compactTime}>{formatTime(baseDate)}</Text>
      </View>
      <View
        style={[
          styles.compactStatus,
          {
            backgroundColor: isCompleted
              ? PRIORITY_COLORS.high
              : PRIORITY_COLORS.medium,
          },
        ]}
      />
    </Pressable>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, compact, day }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createTaskCardStyles(colors), [colors]);

  if (compact) {
    return <TaskCardCompact task={task} onPress={onPress} day={day} />;
  }

  const handlePress = () => {
    onPress?.(task);
  };

  const baseDate = getTaskBaseDate(task, day);
  const displayDate = getDisplayDate(task, day ?? task.startTime);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        styles[getPriorityStyle(task.priority)],
        { opacity: pressed ? 0.9 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Task details: ${task.title}`}
    >
      {/* Header: Emoji + Title + Interest */}
      <View style={styles.header}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{task.emoji || "📌"}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{task.title}</Text>
            {task.Categorys && task.Categorys.length > 0 && (
              <View style={styles.interestBadge}>
                <Text style={styles.interestText}>{task.Categorys[0].name}</Text>
              </View>
            )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Details Grid */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{formatDate(displayDate)}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⏰</Text>
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{formatTime(baseDate)}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⚡</Text>
          <Text style={styles.detailLabel}>Priority:</Text>
          <Text style={styles.detailValue}>
            {getPriorityLabel(task.priority)}
          </Text>
        </View>
        {task.Categorys && task.Categorys.length > 0 && (
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🏷️</Text>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>
              {task.Categorys.map((c) => c.name).join(", ")}
            </Text>
          </View>
        )}
      </View>

      {/* Status + Repetition */}
      <View style={styles.statusContainer}>
        {(() => {
          const isCompleted = isTaskCompletedForDate(task, day ?? task.startTime);
          return (
            <View
              style={[
                styles.statusBadge,
                isCompleted
                  ? styles.statusCompleted
                  : styles.statusPending,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isCompleted
                    ? styles.statusDotCompleted
                    : styles.statusDotPending,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  isCompleted
                    ? styles.statusTextCompleted
                    : styles.statusTextPending,
                ]}
              >
                {isCompleted ? "Completed" : "Pending"}
              </Text>
            </View>
          );
        })()}

        {task.repetition && task.repetition.length > 0 && (
          <View style={styles.repetitionContainer}>
            {task.repetition.slice(0, 3).map((rep, idx) => (
              <View key={idx} style={styles.repetitionBadge}>
                <Text style={styles.repetitionText}>
                  {formatRepetitionLabel(rep.frequency)}
                </Text>
              </View>
            ))}
            {task.repetition.length > 3 && (
              <View style={styles.repetitionBadge}>
                <Text style={styles.repetitionText}>
                  +{task.repetition.length - 3}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

export default TaskCard;
