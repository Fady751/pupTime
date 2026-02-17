import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Task } from "../../types/task";
import useTheme from "../../Hooks/useTheme";

interface TaskSelectorProps {
  task: Task | null;
  onPressSelect: () => void;
}

export const TaskSelector: React.FC<TaskSelectorProps> = ({ task, onPressSelect }) => {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginTop: 24,
          marginHorizontal: 24,
        },
        label: {
          fontSize: 14,
          color: colors.secondaryText,
          marginBottom: 6,
        },
        selector: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        taskInfo: {
          flexDirection: "row",
          alignItems: "center",
          flexShrink: 1,
        },
        emoji: {
          fontSize: 20,
          marginRight: 8,
        },
        taskTitle: {
          fontSize: 15,
          color: colors.text,
          fontWeight: "500",
          flexShrink: 1,
        },
        selectText: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.primary,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>On Task:</Text>
      <Pressable style={styles.selector} onPress={onPressSelect}>
        {task ? (
          <View style={styles.taskInfo}>
            <Text style={styles.emoji}>{task.emoji || "📌"}</Text>
            <Text style={styles.taskTitle} numberOfLines={1}>
              {task.title}
            </Text>
          </View>
        ) : (
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>No task selected</Text>
          </View>
        )}
        <Text style={styles.selectText}>{task ? "Change" : "Select Task"}</Text>
      </Pressable>
    </View>
  );
};

export default TaskSelector;
