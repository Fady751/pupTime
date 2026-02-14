import React from "react";
import { Schedule } from "../../components/Schedule";
import { Task } from "../../types/task";

// Mock tasks for demonstration
const MOCK_TASKS: Task[] = [
  {
    id: 1,
    user_id: 1,
    title: "Morning workout",
    interests: { id: 1, title: "Fitness", category: { id: 1, name: "Health" } },
    status: "pending",
    reminderTime: new Date(2026, 1, 14, 7, 0), // Feb 14, 2026
    priority: "high",
    repetition: ["daily"],
    emoji: "🏋️",
  },
  {
    id: 2,
    user_id: 1,
    title: "Team standup meeting",
    interests: { id: 2, title: "Work", category: { id: 2, name: "Career" } },
    status: "pending",
    reminderTime: new Date(2026, 1, 14, 10, 0),
    priority: "medium",
    repetition: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    emoji: "💼",
  },
  {
    id: 3,
    user_id: 1,
    title: "Valentine's Day dinner 💕",
    interests: { id: 3, title: "Social", category: { id: 3, name: "Personal" } },
    status: "pending",
    reminderTime: new Date(2026, 1, 14, 19, 30),
    priority: "high",
    repetition: ["once"],
    emoji: "🍷",
  },
  {
    id: 4,
    user_id: 1,
    title: "Read for 30 minutes",
    interests: { id: 4, title: "Learning", category: { id: 4, name: "Education" } },
    status: "completed",
    reminderTime: new Date(2026, 1, 14, 21, 0),
    priority: "low",
    repetition: ["daily"],
    emoji: "📚",
  },
  {
    id: 5,
    user_id: 1,
    title: "Project deadline",
    interests: { id: 2, title: "Work", category: { id: 2, name: "Career" } },
    status: "pending",
    reminderTime: new Date(2026, 1, 20, 17, 0),
    priority: "high",
    repetition: ["once"],
    emoji: "🎯",
  },
  {
    id: 6,
    user_id: 1,
    title: "Grocery shopping",
    interests: { id: 5, title: "Errands", category: { id: 3, name: "Personal" } },
    status: "pending",
    reminderTime: new Date(2026, 1, 15, 11, 0),
    priority: "medium",
    repetition: ["saturday"],
    emoji: "🛒",
  },
  {
    id: 7,
    user_id: 1,
    title: "Call Mom",
    interests: { id: 6, title: "Family", category: { id: 3, name: "Personal" } },
    status: "pending",
    reminderTime: new Date(2026, 1, 16, 18, 0),
    priority: "none",
    repetition: ["sunday"],
    emoji: "📞",
  },
  {
    id: 8,
    user_id: 1,
    title: "Dentist appointment",
    interests: { id: 1, title: "Health", category: { id: 1, name: "Health" } },
    status: "pending",
    reminderTime: new Date(2026, 1, 18, 14, 30),
    priority: "medium",
    repetition: ["once"],
    emoji: "🦷",
  },
  {
    id: 9,
    user_id: 1,
    title: "Pay rent",
    interests: { id: 7, title: "Finance", category: { id: 5, name: "Finance" } },
    status: "pending",
    reminderTime: new Date(2026, 2, 1, 9, 0),
    priority: "high",
    repetition: ["monthly"],
    emoji: "🏠",
  },
  {
    id: 10,
    user_id: 1,
    title: "Yoga class",
    interests: { id: 1, title: "Fitness", category: { id: 1, name: "Health" } },
    status: "pending",
    reminderTime: new Date(2026, 1, 14, 6, 30),
    priority: "low",
    repetition: ["wednesday", "friday"],
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
