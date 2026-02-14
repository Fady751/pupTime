import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Task } from "../../types/task";
import createTaskCardStyles, { PRIORITY_COLORS } from "./TaskCard.styles";
import useTheme from "../../Hooks/useTheme";

type TaskCardProps = {
  task: Task;
  onPress?: (task: Task) => void;
  compact?: boolean;
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
        <Text style={styles.compactTime}>{formatTime(task.reminderTime)}</Text>
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
          {task.interests && (
            <View style={styles.interestBadge}>
              <Text style={styles.interestText}>{task.interests.title}</Text>
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
          <Text style={styles.detailValue}>
            {formatDate(task.reminderTime)}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⏰</Text>
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>
            {formatTime(task.reminderTime)}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⚡</Text>
          <Text style={styles.detailLabel}>Priority:</Text>
          <Text style={styles.detailValue}>
            {getPriorityLabel(task.priority)}
          </Text>
        </View>

        {task.interests?.category && (
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🏷️</Text>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{task.interests.category.name}</Text>
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
                  {rep === "once" ? "Once" : rep.slice(0, 3)}
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
