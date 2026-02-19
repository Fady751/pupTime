import React, { useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { createStyles } from "./Tasks.styles";
import { useNavigation } from "@react-navigation/native";
import { Task } from "../../types/task";
import useTheme from "../../Hooks/useTheme";
import TaskCard from "../../components/Task/TaskCard";
import { useTasks } from "../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

const TasksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data } = useSelector((state: RootState) => state.user);

  const { tasks, createTask, updateTask, deleteTask } = useTasks(data?.id as number);
  // const [tasks, setTasks] = useState<Task[]>([]);

  const handleAddTask = () => {
    navigation.navigate("AddTask", {
      onSave: (newTask: Task) => createTask(newTask),
    });
  };

  const handleEditTask = (task: Task) => {
    navigation.navigate("EditTask", {
      task,
      onSave: (updatedTask: Task) =>
        updateTask(updatedTask.id, updatedTask),
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
          deleteTask(id);
          Alert.alert("Task Deleted", "The task has been deleted successfully.", [{ text: "OK" }]);
        }}
      ]
    );
  };

  const toggleComplete = (id: string) => {
      // Find the task and toggle its status
      const task = tasks.find(t => t.id === id);
      if (task) {
        updateTask(id, { ...task, status: task.status === "completed" ? "pending" : "completed" });
      }
  };

  const renderRightActions = (id: string) => (
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
        <TaskCard task={item} onPress={handleEditTask} day={item.startTime} />

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
        contentContainerStyle={[
          styles.listContent,
          tasks.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyTitle}>Your schedule is clear</Text>
            <Text style={styles.emptySubtitle}>
              Add your first task to get started. We’ll keep it organized and on time.
            </Text>
            <TouchableOpacity style={styles.emptyAction} onPress={handleAddTask}>
              <Text style={styles.emptyActionText}>Create your first task</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Text style={styles.addText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TasksScreen;