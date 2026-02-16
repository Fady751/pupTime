import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { createStyles } from "./styles";
import { Task, RepetitionFrequency, TaskRepetition } from "../../types/task";
import { getCategories } from "../../services/interestService/getCategories";
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
};

const AddTaskScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onSave: (task: Task) => void = route?.params?.onSave;

  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "none">("none");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [repetitionFrequency, setRepetitionFrequency] = useState<RepetitionFrequency | null>(null);
  const [reminder, setReminder] = useState<number | null>(null);
  const [emoji, setEmoji] = useState<string>("");
  const [reminderOptions, setReminderOptions] = useState<number[]>(DEFAULT_REMINDERS);
  const [customReminder, setCustomReminder] = useState("");
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [selectedWeekdays, setSelectedWeekdays] = useState<RepetitionFrequency[]>([]);
  const [weekdayTimes, setWeekdayTimes] = useState<Record<string, Date | null>>({});
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
        // Remove from weekdayTimes when deselecting
        setWeekdayTimes(times => {
          const newTimes = { ...times };
          delete newTimes[day];
          return newTimes;
        });
        return prev.filter(d => d !== day);
      } else {
        // Initialize as "all day" (null) when selecting
        setWeekdayTimes(times => ({ ...times, [day]: null }));
        return [...prev, day];
      }
    });
  };

  const handleWeekdayTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date
  ) => {
    const day = activeWeekdayTimePicker;
    setActiveWeekdayTimePicker(null);
    if (event.type === "dismissed" || !day) return;
    if (selectedTime) {
      setWeekdayTimes(prev => ({ ...prev, [day]: selectedTime }));
    }
  };

  const toggleWeekdayAllDay = (day: string) => {
    setWeekdayTimes(prev => ({
      ...prev,
      [day]: prev[day] ? null : new Date(), // toggle between null and a default time
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
            time: weekdayTimes[day] || null, // per-day time or null for all day
          }))
        : [
            {
              frequency: repetitionFrequency,
              time: null, // non-weekly frequencies don't need specific time
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
      id: Date.now(),
      user_id: 0,
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
      status: "pending",
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
    if (selectedDate) {
      // Set only the date portion, keep time at midnight
      const next = new Date(selectedDate);
      next.setHours(0, 0, 0, 0);
      setDate(next);
    }
  };

  const handleEndDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowEndDatePicker(false);
    if (event.type === "dismissed") return;
    if (selectedDate) {
      // Set only the date portion, keep time at midnight
      const next = new Date(selectedDate);
      next.setHours(0, 0, 0, 0);
      setEndDate(next);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Add Task</Text>

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
      <Text style={styles.label}>Start Time</Text>
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

      {/* End Date */}
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
              if (option !== "weekly") {
                setSelectedWeekdays([]);
                setWeekdayTimes({});
              }
            }}
          >
            <Text style={styles.reminderText}>{option}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.reminderBtn, !repetitionFrequency && styles.reminderSelected]}
          onPress={() => {
            setRepetitionFrequency(null);
            setSelectedWeekdays([]);
            setWeekdayTimes({});
          }}
        >
          <Text style={styles.reminderText}>None</Text>
        </TouchableOpacity>
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
          {/* Per-day time selection */}
          {selectedWeekdays.map(day => (
            <View key={day} style={styles.weekdayTimeRow}>
              <Text style={styles.weekdayTimeLabel}>{WEEKDAY_SHORT[day]}</Text>
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
                    ? weekdayTimes[day]!.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Set Time"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
      {activeWeekdayTimePicker && (
        <DateTimePicker
          value={weekdayTimes[activeWeekdayTimePicker] || new Date()}
          mode="time"
          display="default"
          onChange={handleWeekdayTimeChange}
        />
      )}

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
        <Text style={styles.saveText}>Add Task</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddTaskScreen;
