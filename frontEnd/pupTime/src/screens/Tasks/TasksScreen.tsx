import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { createStyles } from "./Tasks.styles";
import { useNavigation } from "@react-navigation/native";
import { Task } from "../../types/task";
import useTheme from "../../Hooks/useTheme";
import TaskCard from "../../components/Task/TaskCard";

const TasksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      user_id: 0,
      title: "Go To Gym",
      status: "pending",
      Categorys: [],
      reminderTime: null,
      startTime: new Date(),
      endTime: null,
      priority: "none",
      repetition: [],
      emoji: "💪",
    },
    {
      id: 2,
      user_id: 0,
      title: "Study React Native",
      status: "pending",
      Categorys: [],
      reminderTime: null,
      startTime: new Date(),
      endTime: null,
      priority: "medium",
      repetition: [],
      emoji: "📚",
    },
    {
      id: 3,
      user_id: 0,
      title: "Buy Groceries",
      status: "completed",
      Categorys: [],
      reminderTime: null,
      startTime: new Date(),
      endTime: null,
      priority: "low",
      repetition: [],
      emoji: "🛒",
    },
  ]);

  const handleAddTask = () => {
    navigation.navigate("AddTask", {
      onSave: (newTask: Task) => setTasks(prev => [newTask, ...prev]),
    });
  };

  const handleEditTask = (task: Task) => {
    navigation.navigate("EditTask", {
      task,
      onSave: (updatedTask: Task) =>
        setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t))),
    });
  };

  const handleDelete = (id: number) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const toggleComplete = (id: number) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? {
              ...task,
              status: task.status === "completed" ? "pending" : "completed",
            }
          : task
      )
    );
  };

  const renderRightActions = (id: number) => (
    <TouchableOpacity
      style={styles.deleteBox}
      onPress={() => handleDelete(id)}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Task }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <View style={styles.cardWrapper}>
        <TaskCard task={item} onPress={handleEditTask} />

        <TouchableOpacity
          style={styles.completeBtnContainer}
          onPress={() => toggleComplete(item.id)}
        >
          <View
            style={[
              styles.completeBtn,
              item.status === "completed" && styles.completedBtn,
            ]}
          >
            <Text style={styles.completeText}>
              {item.status === "completed" ? "Done" : "Mark"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Tasks</Text>

      <FlatList
        data={tasks}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Text style={styles.addText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TasksScreen;