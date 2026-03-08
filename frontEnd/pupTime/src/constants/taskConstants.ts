export const PRIORITIES = [ "low", "medium", "high" ] as const;

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
  { id: "general", label: "✨ General", emojis: [ "✅", "⭐", "🎯", "💡", "🔥", "⚡", "🚀", "💎", "🏆", "🔑" ] },
  { id: "work", label: "💼 Work", emojis: [ "📝", "📊", "📈", "💻", "📧", "📋", "🗂️", "📎", "🖊️", "📁" ] },
  { id: "health", label: "💪 Health", emojis: [ "🏃", "🧘", "🏋️", "🥗", "💊", "🧠", "😴", "🚴", "🏊", "❤️" ] },
  { id: "study", label: "📚 Study", emojis: [ "📖", "✍️", "🧪", "🎓", "📐", "🔬", "🗓️", "🧮", "🖥️", "📕" ] },
  { id: "life", label: "🏠 Life", emojis: [ "🛒", "🍳", "🧹", "🪴", "🐶", "🎁", "💰", "🏦", "🧺", "🔧" ] },
  { id: "social", label: "🎉 Social", emojis: [ "☎️", "💬", "🤝", "🎂", "✈️", "📸", "🎮", "🎵", "🎬", "🍽️" ] },
];
