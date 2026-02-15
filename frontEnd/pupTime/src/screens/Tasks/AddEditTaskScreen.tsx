import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import styles from "./AddEditTask.styles";
import { Task } from "./TasksScreen";

type Props = {
  route?: any;
  navigation?: any;
};

const categories = [
  { id: 1, name: "Work" },
  { id: 2, name: "Study" },
  { id: 3, name: "Fitness" },
  { id: 4, name: "Shopping" },
];

const priorities = ["low", "medium", "high", "none"];
const reminders = [5, 10, 15, 30, 60];
const emojis = ["📝", "💪", "📚", "🛒", "🎯", "⚡️"];

const AddEditTaskScreen: React.FC<Props> = ({ route, navigation }) => {
  const mode = route?.params?.mode;
  const taskToEdit: Task = route?.params?.task;
  const onSave: (task: Task) => void = route?.params?.onSave;

  const [title, setTitle] = useState(taskToEdit?.title || "");
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    taskToEdit?.categories || []
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "none">(
    taskToEdit?.priority || "none"
  );
  const [date, setDate] = useState(new Date(taskToEdit?.startTime || new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminder, setReminder] = useState<number | null>(
    taskToEdit?.reminder || null
  );
  const [emoji, setEmoji] = useState<string>(taskToEdit?.emoji || "");

  const toggleCategory = (id: number) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(prev => prev.filter(c => c !== id));
    } else {
      setSelectedCategories(prev => [...prev, id]);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter task title");
      return;
    }

    const task: Task = {
      id: taskToEdit?.id || Date.now(),
      title,
      categories: selectedCategories,
      priority,
      startTime: date.toISOString(),
      reminder,
      emoji,
      status: taskToEdit?.status || "pending",
    };

    if (onSave) onSave(task);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{mode === "edit" ? "Edit Task" : "Add Task"}</Text>

      {/* Title */}
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Task title..."
        value={title}
        onChangeText={setTitle}
      />

      {/* Categories */}
      <Text style={styles.label}>Categories</Text>
      <View style={styles.categoriesContainer}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryBtn,
              selectedCategories.includes(cat.id) && styles.categorySelected,
            ]}
            onPress={() => toggleCategory(cat.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategories.includes(cat.id) && styles.categoryTextSelected,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Priority */}
      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityContainer}>
        {priorities.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityBtn, priority === p && styles.prioritySelected]}
            onPress={() => setPriority(p as any)}
          >
            <Text style={styles.priorityText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date & Time */}
      <Text style={styles.label}>Start Time</Text>
      <TouchableOpacity
        style={styles.dateBtn}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateText}>{date.toLocaleString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={(e, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {/* Reminder */}
      <Text style={styles.label}>Reminder (minutes)</Text>
      <View style={styles.reminderContainer}>
        {reminders.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.reminderBtn, reminder === r && styles.reminderSelected]}
            onPress={() => setReminder(r)}
          >
            <Text style={styles.reminderText}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Emoji */}
      <Text style={styles.label}>Emoji</Text>
      <View style={styles.emojiContainer}>
        {emojis.map(e => (
          <TouchableOpacity
            key={e}
            style={[styles.emojiBtn, emoji === e && styles.emojiSelected]}
            onPress={() => setEmoji(e)}
          >
            <Text style={styles.emojiText}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>Save Task</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddEditTaskScreen;