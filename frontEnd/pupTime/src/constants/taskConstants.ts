export const PRIORITIES = [ "low", "medium", "high", "none" ] as const;

export const DEFAULT_REMINDERS = [ 5, 10, 15, 30, 60 ];

export const REPETITION_BASE_OPTIONS = [
  "once",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export const WEEKDAY_OPTIONS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export const EMOJI_CATEGORIES = [
  { id: "work", label: "Work", emojis: [ "📝", "📌", "📅", "📈", "🧠" ] },
  { id: "fitness", label: "Fitness", emojis: [ "💪", "🏃", "🧘", "🏋️", "⚡️" ] },
  { id: "study", label: "Study", emojis: [ "📚", "✍️", "🧪", "🧮", "💡" ] },
  { id: "shopping", label: "Shopping", emojis: [ "🛒", "🧾", "🎁", "🛍️", "💳" ] },
  { id: "focus", label: "Focus", emojis: [ "🎯", "⏱️", "✅", "🔔", "🌟" ] },
];
