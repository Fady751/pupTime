import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { createStyles } from "./styles";
import { Task, RepetitionFrequency, TaskRepetition } from "../../types/task";
import { getCategories } from "../../services/TaskService/syncService";
import { Category } from "../../types/category";
import {
  PRIORITIES,
  DEFAULT_REMINDERS,
  REPETITION_BASE_OPTIONS,
  WEEKDAY_OPTIONS,
  EMOJI_CATEGORIES,
} from "../../constants/taskConstants";
import useTheme from "../../Hooks/useTheme";

const WEEKDAY_SHORT: Record<string, string> = {
  sunday: "Su",
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
};

type Props = {
  route?: any;
  navigation?: any;
  onSave?: (task: Task) => void;
};

const EditTaskScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const taskToEdit: Task = route?.params?.task;
  const onSave: (task: Task) => void = route?.params?.onSave;

  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState(taskToEdit?.title || "");
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    taskToEdit?.Categorys?.map(c => c.id) || []
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "none">(
    taskToEdit?.priority || "none"
  );
  const [date, setDate] = useState(() => {
    const raw = taskToEdit?.startTime;
    if (!raw) return new Date();
    return raw instanceof Date ? raw : new Date(raw);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const raw = taskToEdit?.endTime;
    if (!raw) return null;
    return raw instanceof Date ? raw : new Date(raw);
  });
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [repetitionFrequency, setRepetitionFrequency] = useState<
    RepetitionFrequency | null
  >(() => {
    const existing = taskToEdit?.repetition?.map(item => item.frequency) || [];
    const hasWeekdays = existing.some(day => WEEKDAY_OPTIONS.includes(day));
    if (hasWeekdays) return "weekly";
    const first = taskToEdit?.repetition?.[0]?.frequency;
    return REPETITION_BASE_OPTIONS.includes(first as RepetitionFrequency)
      ? (first as RepetitionFrequency)
      : null;
  });
  const [reminder, setReminder] = useState<number | null>(
    taskToEdit?.reminderTime || null
  );
  const [emoji, setEmoji] = useState<string>(taskToEdit?.emoji || "");
  const [reminderOptions, setReminderOptions] = useState<number[]>(() => {
    if (taskToEdit?.reminderTime && !DEFAULT_REMINDERS.includes(taskToEdit.reminderTime)) {
      return [...DEFAULT_REMINDERS, taskToEdit.reminderTime].sort((a, b) => a - b);
    }
    return DEFAULT_REMINDERS;
  });
  const [customReminder, setCustomReminder] = useState("");
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(
    EMOJI_CATEGORIES[0].id
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<
    RepetitionFrequency[]
  >(() => {
    const existing = taskToEdit?.repetition?.map(item => item.frequency) || [];
    return existing.filter(day => WEEKDAY_OPTIONS.includes(day));
  });
  const [weekdayTimes, setWeekdayTimes] = useState<Record<string, Date | null>>(() => {
    const times: Record<string, Date | null> = {};
    taskToEdit?.repetition?.forEach(rep => {
      if (WEEKDAY_OPTIONS.includes(rep.frequency)) {
        times[rep.frequency] = rep.time ? (rep.time instanceof Date ? rep.time : new Date(rep.time)) : null;
      }
    });
    return times;
  });
  const [activeWeekdayTimePicker, setActiveWeekdayTimePicker] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        setCategories(response);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  const toggleCategory = (id: number) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(prev => prev.filter(c => c !== id));
    } else {
      setSelectedCategories(prev => [...prev, id]);
    }
  };

  const toggleWeekday = (day: RepetitionFrequency) => {
    setSelectedWeekdays(prev => {
      if (prev.includes(day)) {
        setWeekdayTimes(times => {
          const copy = { ...times };
          delete copy[day];
          return copy;
        });
        return prev.filter(d => d !== day);
      } else {
        setWeekdayTimes(times => ({ ...times, [day]: null }));
        return [...prev, day];
      }
    });
  };

  const handleWeekdayTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') {
      setActiveWeekdayTimePicker(null);
      if (event.type === 'dismissed') return;
    }
    if (selectedDate && activeWeekdayTimePicker) {
      setWeekdayTimes(prev => ({
        ...prev,
        [activeWeekdayTimePicker]: selectedDate,
      }));
    }
    if (Platform.OS === 'ios') {
      setActiveWeekdayTimePicker(null);
    }
  };

  const toggleWeekdayAllDay = (day: string) => {
    setWeekdayTimes(prev => ({
      ...prev,
      [day]: prev[day] ? null : new Date(),
    }));
  };

  const handleReminderSelect = (value: number) => {
    setReminder(prev => (prev === value ? null : value));
  };

  const handleAddCustomReminder = () => {
    const nextValue = Number(customReminder);
    if (!Number.isFinite(nextValue) || nextValue <= 0) return;
    setReminderOptions(prev =>
      Array.from(new Set([...prev, nextValue])).sort((a, b) => a - b)
    );
    setReminder(nextValue);
    setCustomReminder("");
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter task title");
      return;
    }

    const repetition: TaskRepetition[] = repetitionFrequency
      ? repetitionFrequency === "weekly" && selectedWeekdays.length > 0
        ? selectedWeekdays.map(day => ({
            frequency: day,
            time: weekdayTimes[day] || null,
          }))
        : [
            {
              frequency: repetitionFrequency,
              time: null,
            },
          ]
      : [];

    // Normalize start and end dates to day-only (ignore hours)
    const startDateOnly = new Date(date);
    startDateOnly.setHours(0, 0, 0, 0);
    let endDateOnly: Date | null = null;
    if (endDate) {
      endDateOnly = new Date(endDate);
      endDateOnly.setHours(0, 0, 0, 0);
    }

    const task: Task = {
      id: taskToEdit?.id,
      user_id: taskToEdit?.user_id || 0,
      title,
      Categorys: selectedCategories.map(id => 
        categories.find(c => c.id === id)!
      ).filter(Boolean),
      priority,
      startTime: startDateOnly,
      endTime: endDateOnly,
      repetition,
      reminderTime: reminder,
      emoji,
      status: taskToEdit?.status || "pending",
    };

    if (onSave) onSave(task);
    navigation.goBack();
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowDatePicker(false);
    if (event.type === "dismissed") return;
    if (selectedDate) setDate(selectedDate);
  };

  const handleEndDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowEndDatePicker(false);
    if (event.type === "dismissed") return;
    if (selectedDate) setEndDate(selectedDate);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.header}>Edit Task</Text>

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesScrollContent}
      >
        {categories.map(cat => {
          const isSelected = selectedCategories.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
              onPress={() => toggleCategory(cat.id)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isSelected && styles.categoryChipTextSelected,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Priority */}
      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityContainer}>
        {PRIORITIES.map(p => (
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
      <Text style={styles.label}>Start Date</Text>
      <TouchableOpacity
        style={styles.dateBtn}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* End Time */}
      <Text style={styles.label}>End Date</Text>
      <View style={styles.priorityContainer}>
        <TouchableOpacity
          style={[styles.priorityBtn, !endDate && styles.prioritySelected]}
          onPress={() => setEndDate(null)}
        >
          <Text style={styles.priorityText}>No end date</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.priorityBtn, !!endDate && styles.prioritySelected]}
          onPress={() => {
            if (!endDate) setEndDate(new Date(date));
            setShowEndDatePicker(true);
          }}
        >
          <Text style={styles.priorityText}>Pick end date</Text>
        </TouchableOpacity>
      </View>
      {!!endDate && (
        <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || date}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
        />
      )}

      {/* Repetition */}
      <Text style={styles.label}>Repetition</Text>
      <View style={styles.reminderContainer}>
        {REPETITION_BASE_OPTIONS.map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.reminderBtn,
              repetitionFrequency === option && styles.reminderSelected,
            ]}
            onPress={() => {
              setRepetitionFrequency(option);
              if (option !== "weekly") setSelectedWeekdays([]);
            }}
          >
            <Text style={styles.reminderText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {repetitionFrequency === "weekly" && (
        <>
          <View style={styles.weekdayContainer}>
            {WEEKDAY_OPTIONS.map(day => {
              const isSelected = selectedWeekdays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.weekdayChip,
                    isSelected && styles.weekdayChipSelected,
                  ]}
                  onPress={() => toggleWeekday(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.weekdayChipText,
                      isSelected && styles.weekdayChipTextSelected,
                    ]}
                  >
                    {WEEKDAY_SHORT[day] || day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedWeekdays.map(day => (
            <View key={day} style={styles.weekdayTimeRow}>
              <Text style={styles.weekdayTimeLabel}>{WEEKDAY_SHORT[day] || day}</Text>
              <TouchableOpacity
                style={[
                  styles.weekdayTimeToggle,
                  !weekdayTimes[day] && styles.weekdayTimeToggleActive,
                ]}
                onPress={() => toggleWeekdayAllDay(day)}
              >
                <Text
                  style={[
                    styles.weekdayTimeToggleText,
                    !weekdayTimes[day] && styles.weekdayTimeToggleTextActive,
                  ]}
                >
                  All Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.weekdayTimeToggle,
                  !!weekdayTimes[day] && styles.weekdayTimeToggleActive,
                ]}
                onPress={() => setActiveWeekdayTimePicker(day)}
              >
                <Text
                  style={[
                    styles.weekdayTimeToggleText,
                    !!weekdayTimes[day] && styles.weekdayTimeToggleTextActive,
                  ]}
                >
                  {weekdayTimes[day]
                    ? weekdayTimes[day]!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Set Time'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          {activeWeekdayTimePicker && (
            <DateTimePicker
              value={weekdayTimes[activeWeekdayTimePicker] || new Date()}
              mode="time"
              display="default"
              onChange={handleWeekdayTimeChange}
            />
          )}
        </>
      )}
      <View style={styles.priorityContainer}>
        <TouchableOpacity
          style={[styles.priorityBtn, !repetitionFrequency && styles.prioritySelected]}
          onPress={() => {
            setRepetitionFrequency(null);
            setSelectedWeekdays([]);
            setWeekdayTimes({});
          }}
        >
          <Text style={styles.priorityText}>None</Text>
        </TouchableOpacity>
      </View>

      {/* Reminder */}
      <Text style={styles.label}>Reminder (minutes)</Text>
      <View style={styles.reminderContainer}>
        {reminderOptions.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.reminderBtn, reminder === r && styles.reminderSelected]}
            onPress={() => handleReminderSelect(r)}
          >
            <Text style={styles.reminderText}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.inlineRow}>
        <TextInput
          style={styles.smallInput}
          placeholder="Custom minutes"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={customReminder}
          onChangeText={setCustomReminder}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddCustomReminder}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Emoji */}
      <Text style={styles.label}>Emoji</Text>
      <View style={styles.emojiTabsContainer}>
        {EMOJI_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.emojiTab,
              selectedEmojiCategory === cat.id && styles.emojiTabActive,
            ]}
            onPress={() => setSelectedEmojiCategory(cat.id)}
          >
            <Text
              style={[
                styles.emojiTabText,
                selectedEmojiCategory === cat.id && styles.emojiTabTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.emojiContainer}>
        {EMOJI_CATEGORIES
          .find(cat => cat.id === selectedEmojiCategory)
          ?.emojis.map(e => (
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
        <Text style={styles.saveText}>Update Task</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default EditTaskScreen;
