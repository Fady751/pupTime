import React, { useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RootState } from "../../redux/store";
import useTheme from "../../Hooks/useTheme";
import { useTasks } from "../../Hooks/useTasks";
import createHomeStyles from "./HomeScreen.styles";
import { BottomBar } from "../../components/BottomBar/BottomBar";
import {
  type TaskTemplate,
  type TaskOverride,
  toLocalDateString,
  floorDateByTimezone,
  getOverridesForBetweenDate,
} from "../../types/task";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
  none: "#9CA3AF",
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#22C55E",
  SKIPPED: "#9CA3AF",
  RESCHEDULED: "#8B5CF6",
  PENDING: "#F59E0B",
};

const QUICK_ACTION_COLORS = [
  { bg: "#DBEAFE", icon: "#2563EB" },
  { bg: "#FEF3C7", icon: "#D97706" },
  { bg: "#D1FAE5", icon: "#059669" },
  { bg: "#F3E8FF", icon: "#7C3AED" },
  { bg: "#FCE7F3", icon: "#DB2777" },
];

const FEATURE_CARDS = [
  { key: "tasks", icon: "✅", title: "My Tasks", desc: "Manage your daily tasks and stay organized", route: "Tasks", color: "#DBEAFE" },
  { key: "templates", icon: "📋", title: "Hobbies", desc: "Browse and manage all hobbies", route: "TemplatesList", color: "#E0F2FE" },
  { key: "schedule", icon: "📅", title: "Schedule", desc: "View calendar and upcoming events", route: "Schedule", color: "#FEF3C7" },
  { key: "timer", icon: "⏱", title: "Focus Timer", desc: "Start Pomodoro sessions, build streaks", route: "Timer", color: "#D1FAE5" },
  { key: "friends", icon: "👥", title: "Friends", desc: "Connect with your accountability partners", route: "Friends", color: "#F3E8FF" },
  { key: "profile", icon: "👤", title: "Profile", desc: "View and edit your personal info", route: "Profile", color: "#FCE7F3" },
  { key: "settings", icon: "⚙️", title: "Settings", desc: "Customize your PupTime experience", route: "Settings", color: "#E0E7FF" },
];

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Small progress is still progress.", author: "Unknown" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createHomeStyles(colors), [colors]);
    const route = useRoute();

  const user = useSelector((state: RootState) => state.user.data);
  const userId = user?.id;

  // Today's date string in local timezone
    const dateStr = useMemo(() => floorDateByTimezone(new Date().toISOString()), []);
  
    const nextDateStr = useMemo(() => {
      const next = new Date();
      next.setDate(next.getDate() + 1);
      return floorDateByTimezone(next.toISOString());
    }, []);
  
    const current_filter = useMemo(() => {
      return {
        start_date: dateStr,
        end_date: nextDateStr,
      }
    }, [dateStr, nextDateStr])
  
    const { tasks, loading, applyFilter } = useTasks(userId!, current_filter);

  const refresh = () => {
    applyFilter({
      start_date: dateStr,
      end_date: nextDateStr,
    });
  };

  // if any component use navication.goBack(), refresh the tasks
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (route.name === "Home") {
        refresh();
      }
    });
    return unsubscribe;
  }, []);

  // Flatten overrides for today
  const todayOverrides = useMemo(
    () => (userId ? getOverridesForBetweenDate(tasks, dateStr, nextDateStr) : []),
    [tasks, dateStr, nextDateStr, userId],
  );

  const pendingOverrides = useMemo(
    () => todayOverrides.filter((o) => o.override.status === "PENDING"),
    [todayOverrides],
  );
  const completedOverrides = useMemo(
    () => todayOverrides.filter((o) => o.override.status === "COMPLETED"),
    [todayOverrides],
  );

  const pendingCount = pendingOverrides.length;
  const completedCount = completedOverrides.length;

  // Pick a random quote (stable for session)
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  // Get user initials or emoji
  const avatarContent = useMemo(() => {
    if (!user?.username) return "👤";
    const parts = user.username.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.username.slice(0, 2).toUpperCase();
  }, [user?.username]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ========== HERO HEADER ========== */}
        <View style={styles.heroContainer}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroGreeting}>
              <Text style={styles.heroSubtitle}>{getGreeting()}</Text>
              <Text style={styles.heroTitle}>
                {user?.username || "Welcome back"} 👋
              </Text>
            </View>
            <Pressable
              style={styles.avatarContainer}
              onPress={() => navigation.navigate("Profile")}
            >
              <Text style={styles.avatarText}>{avatarContent}</Text>
              <View style={styles.avatarOnlineDot} />
            </Pressable>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.streak_cnt ?? 0}🔥</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* ========== QUICK ACTIONS ========== */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsCard}>
            {[
              { icon: "✅", label: "Tasks", route: "Tasks" },
              { icon: "📋", label: "Hobbies", route: "TemplatesList" },
              { icon: "📅", label: "Schedule", route: "Schedule" },
              { icon: "⏱", label: "Focus", route: "Timer" },
              { icon: "👥", label: "Friends", route: "Friends" },
            ].map((action, idx) => (
              <Pressable
                key={action.route}
                style={styles.quickActionItem}
                onPress={() => navigation.navigate(action.route)}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: QUICK_ACTION_COLORS[idx].bg },
                  ]}
                >
                  <Text style={styles.quickActionEmoji}>{action.icon}</Text>
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ========== TODAY'S TASKS ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Tasks</Text>
            <Pressable onPress={() => navigation.navigate("Tasks")}>
              <Text style={styles.sectionAction}>See All →</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.emptyTasksCard}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : todayOverrides.length > 0 ? (
            todayOverrides.slice(0, 5).map(({ template, override }) => {
              const priorityColor =
                PRIORITY_COLORS[template.priority ?? "none"] ?? PRIORITY_COLORS.none;
              const isCompleted = override.status === "COMPLETED";
              const isSkipped = override.status === "SKIPPED";
              const isDone = isCompleted || isSkipped;
              const statusColor = STATUS_COLORS[override.status] ?? STATUS_COLORS.PENDING;

              return (
                <Pressable
                  key={override.id}
                  style={[
                    styles.taskPreviewCard,
                    { borderLeftColor: priorityColor },
                  ]}
                  onPress={() =>
                    navigation.navigate("EditTask", { taskId: template.id })
                  }
                >
                  <Text style={styles.taskPreviewEmoji}>
                    {template.emoji || "📌"}
                  </Text>
                  <View style={styles.taskPreviewContent}>
                    <Text
                      style={[
                        styles.taskPreviewTitle,
                        isDone && {
                          textDecorationLine: "line-through",
                          color: colors.secondaryText,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {template.title}
                    </Text>
                    <Text style={styles.taskPreviewMeta}>
                      {formatTime(override.instance_datetime)} •{" "}
                      {(template.priority ?? "none").charAt(0).toUpperCase() +
                        (template.priority ?? "none").slice(1)}{" "}
                      priority
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.taskPreviewStatus,
                      { backgroundColor: statusColor },
                    ]}
                  />
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyTasksCard}>
              <Text style={styles.emptyTasksEmoji}>🌤️</Text>
              <Text style={styles.emptyTasksText}>
                No tasks for today. Tap the button below to add one!
              </Text>
            </View>
          )}
        </View>

        {/* ========== FOCUS BANNER ========== */}
        <Pressable
          style={[styles.focusBanner, styles.focusBannerGradient]}
          onPress={() => navigation.navigate("Timer")}
        >
          <View style={styles.focusBannerContent}>
            <Text style={styles.focusBannerTitle}>Ready to focus? 🎯</Text>
            <Text style={styles.focusBannerSubtitle}>
              Start a Pomodoro session and build your streak
            </Text>
          </View>
          <View style={styles.focusBannerButton}>
            <Text style={styles.focusBannerButtonText}>START</Text>
          </View>
        </Pressable>

        {/* ========== EXPLORE FEATURES ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explore</Text>
          </View>
          <View style={styles.featureCardsGrid}>
            {FEATURE_CARDS.map((card) => (
              <Pressable
                key={card.key}
                style={({ pressed }) => [
                  styles.featureCard,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => navigation.navigate(card.route)}
              >
                <View
                  style={[
                    styles.featureCardIconContainer,
                    { backgroundColor: card.color },
                  ]}
                >
                  <Text style={styles.featureCardIcon}>{card.icon}</Text>
                </View>
                <Text style={styles.featureCardTitle}>{card.title}</Text>
                <Text style={styles.featureCardDesc}>{card.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ========== MOTIVATIONAL QUOTE ========== */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>💡</Text>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>

        {/* Bottom spacer for bottom bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ========== BOTTOM BAR ========== */}
      <BottomBar current="Home" navigation={navigation} />
    </SafeAreaView>
  );
};

export default HomeScreen;
