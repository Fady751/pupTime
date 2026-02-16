import React from "react";
import { Schedule } from "../../components/Schedule";
import { Task } from "../../types/task";

// Mock tasks for demonstration, aligned with Task schema
const MOCK_TASKS: Task[] = [
  {
    id: 1,
    user_id: 1,
    title: "Morning workout",
    Categorys: [{ id: 1, name: "Health" }],
    status: "pending",
    startTime: new Date(2026, 1, 14, 7, 0), // Feb 14, 2026
    endTime: null,
    reminderTime: 30,
    priority: "high",
    repetition: [
      {
        frequency: "daily",
        time: new Date(2026, 1, 14, 7, 0),
      },
    ],
    emoji: "🏋️",
  },
  {
    id: 2,
    user_id: 1,
    title: "Team standup meeting",
    Categorys: [{ id: 2, name: "Career" }],
    status: "pending",
    startTime: new Date(2026, 1, 14, 10, 0),
    endTime: null,
    reminderTime: 10,
    priority: "medium",
    repetition: [
      { frequency: "monday", time: new Date(2026, 1, 10, 10, 0) },
      { frequency: "tuesday", time: new Date(2026, 1, 11, 10, 0) },
      { frequency: "wednesday", time: new Date(2026, 1, 12, 10, 0) },
      { frequency: "thursday", time: new Date(2026, 1, 13, 10, 0) },
      { frequency: "friday", time: new Date(2026, 1, 14, 10, 0) },
    ],
    emoji: "💼",
  },
  {
    id: 3,
    user_id: 1,
    title: "Valentine's Day dinner 💕",
    Categorys: [{ id: 3, name: "Personal" }],
    status: "pending",
    startTime: new Date(2026, 1, 14, 19, 30),
    endTime: null,
    reminderTime: 60,
    priority: "high",
    repetition: [
      {
        frequency: "once",
        time: new Date(2026, 1, 14, 19, 30),
      },
    ],
    emoji: "🍷",
  },
  {
    id: 4,
    user_id: 1,
    title: "Read for 30 minutes",
    Categorys: [{ id: 4, name: "Education" }],
    status: "completed",
    startTime: new Date(2026, 1, 14, 21, 0),
    endTime: null,
    reminderTime: 15,
    priority: "low",
    repetition: [
      {
        frequency: "daily",
        time: new Date(2026, 1, 14, 21, 0),
      },
    ],
    emoji: "📚",
  },
  {
    id: 5,
    user_id: 1,
    title: "Project deadline",
    Categorys: [{ id: 2, name: "Career" }],
    status: "pending",
    startTime: new Date(2026, 1, 20, 17, 0),
    endTime: null,
    reminderTime: 120,
    priority: "high",
    repetition: [
      {
        frequency: "once",
        time: new Date(2026, 1, 20, 17, 0),
      },
    ],
    emoji: "🎯",
  },
  {
    id: 6,
    user_id: 1,
    title: "Grocery shopping",
    Categorys: [{ id: 3, name: "Personal" }],
    status: "pending",
    startTime: new Date(2026, 1, 15, 11, 0),
    endTime: null,
    reminderTime: 30,
    priority: "medium",
    repetition: [
      {
        frequency: "saturday",
        time: new Date(2026, 1, 15, 11, 0),
      },
    ],
    emoji: "🛒",
  },
  {
    id: 7,
    user_id: 1,
    title: "Call Mom",
    Categorys: [{ id: 3, name: "Personal" }],
    status: "pending",
    startTime: new Date(2026, 1, 16, 18, 0),
    endTime: null,
    reminderTime: 10,
    priority: "none",
    repetition: [
      {
        frequency: "sunday",
        time: new Date(2026, 1, 16, 18, 0),
      },
    ],
    emoji: "📞",
  },
  {
    id: 8,
    user_id: 1,
    title: "Dentist appointment",
    Categorys: [{ id: 1, name: "Health" }],
    status: "pending",
    startTime: new Date(2026, 1, 18, 14, 30),
    endTime: null,
    reminderTime: 30,
    priority: "medium",
    repetition: [
      {
        frequency: "once",
        time: new Date(2026, 1, 18, 14, 30),
      },
    ],
    emoji: "🦷",
  },
  {
    id: 9,
    user_id: 1,
    title: "Pay rent",
    Categorys: [{ id: 5, name: "Finance" }],
    status: "pending",
    startTime: new Date(2026, 2, 1, 9, 0),
    endTime: null,
    reminderTime: 1440,
    priority: "high",
    repetition: [
      {
        frequency: "monthly",
        time: new Date(2026, 2, 1, 9, 0),
      },
    ],
    emoji: "🏠",
  },
  {
    id: 10,
    user_id: 1,
    title: "Yoga class",
    Categorys: [{ id: 1, name: "Health" }],
    status: "pending",
    startTime: new Date(2026, 1, 14, 6, 30),
    endTime: null,
    reminderTime: 20,
    priority: "low",
    repetition: [
      { frequency: "wednesday", time: new Date(2026, 1, 14, 6, 30) },
      { frequency: "friday", time: new Date(2026, 1, 16, 6, 30) },
    ],
    emoji: "🧘",
  },
];

const ScheduleScreen: React.FC = () => {
  const handleTaskPress = (task: Task) => {
    console.log("Task pressed:", task.title);
  };

  return <Schedule tasks={MOCK_TASKS} onTaskPress={handleTaskPress} />;
};

export default ScheduleScreen;
