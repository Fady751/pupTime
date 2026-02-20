import React, { useMemo, useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Schedule } from "../../components/Schedule";
import { Task, isTaskCompletedForDate, canCompleteForDate, toLocalDateString } from "../../types/task";
import useTheme from "../../Hooks/useTheme";
import { useTasks } from "../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const data = useSelector((state: RootState) => state.user.data);
  const { tasks, createTask, completeTask, uncompleteTask } = useTasks(data?.id as number);
  const [togglingKeys, setTogglingKeys] = useState<string[]>([]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        addButton: {
          position: "absolute",
          bottom: 30,
          right: 20,
          width: 65,
          height: 65,
          borderRadius: 32,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
          elevation: 5,
        },
        addText: {
          color: colors.primaryText,
          fontSize: 30,
          marginTop: -2,
        },
      }),
    [colors]
  );

  const handleTaskPress = (task: Task) => {
    console.log("Task pressed:", task.title);
  };

  const handleCompleteToggle = async (taskId: string, date: Date) => {
    const key = `${taskId}:${toLocalDateString(date)}`;
    if (togglingKeys.includes(key)) return; // already in progress for this task/date

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const completed = isTaskCompletedForDate(task, date);

    setTogglingKeys(prev => [...prev, key]);
    try {
      if (completed) {
        await uncompleteTask(taskId, date);
      } else {
        if (!canCompleteForDate(date)) return;  // silently ignore future dates
        await completeTask(taskId, date);
      }
    } finally {
      setTogglingKeys(prev => prev.filter(k => k !== key));
    }
  };

  const onSave = async (task: Task) => {
    await createTask(task);
  }

  const handleAddTask = () => {
    navigation.navigate("AddTask", { onSave });
  };

  return (
    <View style={styles.container}>
      <Schedule
        tasks={tasks}
        onTaskPress={handleTaskPress}
        onCompleteToggle={handleCompleteToggle}
        isToggling={(taskId, date) =>
          togglingKeys.includes(`${taskId}:${toLocalDateString(date)}`)
        }
      />

      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Text style={styles.addText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ScheduleScreen;
