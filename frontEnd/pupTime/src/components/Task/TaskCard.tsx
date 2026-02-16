import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Task, RepetitionFrequency } from "../../types/task";
import createTaskCardStyles, { PRIORITY_COLORS } from "./TaskCard.styles";
import useTheme from "../../Hooks/useTheme";

type TaskCardProps = {
  task: Task;
  onPress?: (task: Task) => void;
  compact?: boolean;
};

// Get the time (hours/minutes) from the first repetition entry that has a time, or from startTime
const getTaskTime = (task: Task): { hours: number; minutes: number } => {
  if (task.repetition && task.repetition.length > 0) {
    const withTime = task.repetition.find((r) => r.time);
    if (withTime?.time) {
      const t = new Date(withTime.time);
      return { hours: t.getHours(), minutes: t.getMinutes() };
    }
  }
  const t = new Date(task.startTime);
  return { hours: t.getHours(), minutes: t.getMinutes() };
};

// Get a display date for the task (startTime date + repetition time hours/minutes)
const getTaskBaseDate = (task: Task): Date => {
  const base = new Date(task.startTime);
  const time = getTaskTime(task);
  base.setHours(time.hours, time.minutes, 0, 0);
  return base;
};

const formatTime = (date: Date): string => {
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
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createTaskCardStyles(colors), [colors]);
  const handlePress = () => {
    onPress?.(task);
  };

  const baseDate = getTaskBaseDate(task);

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
            backgroundColor:
              task.status === "completed"
                ? PRIORITY_COLORS.high
                : PRIORITY_COLORS.medium,
          },
        ]}
      />
    </Pressable>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, compact }) => {
  if (compact) {
    return <TaskCardCompact task={task} onPress={onPress} />;
  }

  const { colors } = useTheme();
  const styles = useMemo(() => createTaskCardStyles(colors), [colors]);

  const handlePress = () => {
    onPress?.(task);
  };

  const baseDate = getTaskBaseDate(task);

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
          <Text style={styles.detailValue}>{formatDate(baseDate)}</Text>
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
        <View
          style={[
            styles.statusBadge,
            task.status === "completed"
              ? styles.statusCompleted
              : styles.statusPending,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              task.status === "completed"
                ? styles.statusDotCompleted
                : styles.statusDotPending,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              task.status === "completed"
                ? styles.statusTextCompleted
                : styles.statusTextPending,
            ]}
          >
            {task.status === "completed" ? "Completed" : "Pending"}
          </Text>
        </View>

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
