import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { createStyles } from "./Tasks.styles";
import { useNavigation } from "@react-navigation/native";
import { Task, isTaskCompletedForDate, isTaskOnDate, toLocalDateString, canCompleteForDate } from "../../types/task";
import useTheme from "../../Hooks/useTheme";
import TaskCard from "../../components/Task/TaskCard";
import { useTasks } from "../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

type StatusFilter = "all" | "pending" | "completed";

const TasksScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data } = useSelector((state: RootState) => state.user);

  const { tasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask } = useTasks(data?.id as number);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [togglingIds, setTogglingIds] = useState<string[]>([]);

  const dateKey = toLocalDateString(selectedDate);

  const filteredTasks = useMemo(() => {
    const dayTasks = tasks.filter(t => isTaskOnDate(t, selectedDate));
    switch (statusFilter) {
      case "pending":
        return dayTasks.filter(t => !isTaskCompletedForDate(t, selectedDate));
      case "completed":
        return dayTasks.filter(t => isTaskCompletedForDate(t, selectedDate));
      default:
        return dayTasks;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dateKey, statusFilter]);

  const pendingCount = useMemo(
    () => tasks.filter(t => isTaskOnDate(t, selectedDate) && !isTaskCompletedForDate(t, selectedDate)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, dateKey],
  );
  const completedCount = useMemo(
    () => tasks.filter(t => isTaskOnDate(t, selectedDate) && isTaskCompletedForDate(t, selectedDate)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, dateKey],
  );

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (event.type === "dismissed") return;
    if (date) setSelectedDate(date);
  };

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

  const isFutureDate = !canCompleteForDate(selectedDate);

  const toggleComplete = async (id: string) => {
      if (togglingIds.includes(id)) return; // already in progress for this task

      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const completed = isTaskCompletedForDate(task, selectedDate);

      setTogglingIds(prev => [...prev, id]);
      try {
        if (completed) {
          await uncompleteTask(id, selectedDate);
        } else {
          if (isFutureDate) {
            Alert.alert('Not yet', "You can't complete tasks for future dates.");
            return;
          }
          await completeTask(id, selectedDate);
        }
      } finally {
        setTogglingIds(prev => prev.filter(tid => tid !== id));
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

  const renderItem = ({ item }: { item: Task }) => {
    const completed = isTaskCompletedForDate(item, selectedDate);
    const isToggling = togglingIds.includes(item.id);
    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <View style={styles.cardWrapper}>
          <TaskCard task={item} onPress={handleEditTask} day={selectedDate} />

          <TouchableOpacity
            style={styles.completeBtnContainer}
            onPress={() => toggleComplete(item.id)}
            disabled={(!completed && isFutureDate) || isToggling}
          >
            <View
              style={[
                styles.completeBtn,
                completed && styles.completedBtn,
                !completed && isFutureDate && styles.disabledBtn,
              ]}
            >
              <Text style={styles.completeText}>
                {isToggling ? "..." : completed ? "Done" : isFutureDate ? "🔒" : "Mark"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Tasks</Text>

      {/* Date Picker */}
      <TouchableOpacity
        style={styles.dateFilterBtn}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateFilterText}>
          📅 {selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Status Filter Tabs */}
      <View style={styles.filterTabs}>
        {(["all", "pending", "completed"] as StatusFilter[]).map(tab => {
          const isActive = statusFilter === tab;
          const count = tab === "all" ? pendingCount + completedCount : tab === "pending" ? pendingCount : completedCount;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setStatusFilter(tab)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredTasks}
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