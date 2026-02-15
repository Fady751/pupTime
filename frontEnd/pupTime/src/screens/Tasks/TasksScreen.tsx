import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import styles from "./Tasks.styles";
import { useNavigation } from "@react-navigation/native";

export type Task = {
  id: number;
  title: string;
  status: "pending" | "completed";
  categories?: number[];
  priority?: "low" | "medium" | "high" | "none";
  startTime?: string;
  reminder?: number | null;
  emoji?: string;
};

const TasksScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "Go To Gym", status: "pending" },
    { id: 2, title: "Study React Native", status: "pending" },
    { id: 3, title: "Buy Groceries", status: "completed" },
  ]);

  const handleAddTask = () => {
    navigation.navigate("AddEditTask", {
      mode: "add",
      onSave: (newTask: Task) => setTasks(prev => [newTask, ...prev]),
    });
  };

  const handleEditTask = (task: Task) => {
    navigation.navigate("AddEditTask", {
      mode: "edit",
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
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => handleEditTask(item)}
      >
        <Text
          style={[
            styles.taskText,
            item.status === "completed" && styles.completedText,
          ]}
        >
          {item.title}
        </Text>

        <TouchableOpacity
          style={[
            styles.completeBtn,
            item.status === "completed" && styles.completedBtn,
          ]}
          onPress={() => toggleComplete(item.id)}
        >
          <Text style={styles.completeText}>
            {item.status === "completed" ? "Done" : "Mark"}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
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