import React, { useMemo, useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RootState } from "../../redux/store";
import useTheme from "../../Hooks/useTheme";
import { useTasks } from "../../Hooks/useTasks";
import createHomeStyles from "./HomeScreen.styles";

import { listChatRooms } from "../../services/chatService";
import {
  type TaskTemplate,
  type TaskOverride,
  toLocalDateString,
  floorDateByTimezone,
  getOverridesForBetweenDate,
} from "../../types/task";
import socialIcon from "../../assets/socialIcon.png";

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
  { bg: "#E6F4EA", icon: "#137333" },
];

const FEATURE_CARDS = [
  { key: "tasks", icon: "✅", title: "My Tasks", desc: "Manage your daily tasks and stay organized", route: "Tasks", color: "#DBEAFE" },
  { key: "templates", icon: "📋", title: "Hobbies", desc: "Browse and manage all hobbies", route: "TemplatesList", color: "#E0F2FE" },
  { key: "schedule", icon: "📅", title: "Schedule", desc: "View calendar and upcoming events", route: "Schedule", color: "#FEF3C7" },
  // { key: "timer", icon: "⏱", title: "Focus Timer", desc: "Start Pomodoro sessions, build streaks", route: "Timer", color: "#D1FAE5" },
  { key: "friends", icon: "👥", title: "Friends", desc: "Connect with your accountability partners", route: "Friends", color: "#F3E8FF" },
  { key: "notifications", icon: "🔔", title: "Notifications", desc: "Review activity and friend updates", route: "Notifications", color: "#DDEAFE" },
  { key: "profile", icon: "👤", title: "Profile", desc: "View and edit your personal info", route: "Profile", color: "#FCE7F3" },
  { key: "settings", icon: "⚙️", title: "Settings", desc: "Customize your PupTime experience", route: "Settings", color: "#E0E7FF" },
];

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Small progress is still progress.", author: "Unknown" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
];

type ChatSpotlight = {
  roomId: number;
  title: string;
  preview: string;
  memberLabel: string;
};

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
  const [chatSpotlight, setChatSpotlight] = useState<ChatSpotlight | null>(null);
  const [chatSpotlightLoading, setChatSpotlightLoading] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadChatSpotlight = useCallback(async () => {
    if (!userId) {
      setChatSpotlight(null);
      return;
    }

    setChatSpotlightLoading(true);

    try {
      const rooms = await listChatRooms({ page: 1, page_size: 1 });
      const latestRoom = rooms?.[0];

      if (!latestRoom) {
        setChatSpotlight(null);
        return;
      }

      const otherUsers = latestRoom.users.filter((member) => member.id !== userId);
      const title =
        latestRoom.users.length > 2
          ? `Group chat with ${latestRoom.users.length} people`
          : otherUsers[0]?.username || "Direct chat";

      setChatSpotlight({
        roomId: latestRoom.id,
        title,
        preview: latestRoom.latest_message?.content || "Tap to open your latest conversation.",
        memberLabel:
          latestRoom.users.length > 2
            ? `${latestRoom.users.length} members`
            : "1-to-1 chat",
      });
    } catch {
      setChatSpotlight(null);
    } finally {
      setChatSpotlightLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadChatSpotlight();
    }, [loadChatSpotlight]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ========== HERO HEADER ========== */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerGreeting}>{getGreeting()} ☀️</Text>
            <Text style={styles.headerTitle}>{user?.username || "Hany"}</Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconButton} onPress={() => navigation.navigate("Friends")}>
              <Text style={styles.iconText}>👥</Text>
            </Pressable>
            <Pressable style={styles.pillButton}>
              <Text style={styles.pillText}>🔥 {user?.streak_cnt ?? 0}</Text>
            </Pressable>
          </View>
        </View>

        {/* ========== PUP COMPANION CARD ========== */}
        <View style={styles.companionCard}>
          <View style={styles.companionHeader}>
            <View style={styles.companionDogAvatar}>
               <Text style={styles.dogAvatarText}>🐶</Text>
            </View>
            <View>
              <Text style={styles.companionTitle}>PUP</Text>
              <Text style={styles.companionSubtitle}>your companion</Text>
            </View>
          </View>
          
          <View style={styles.companionBodyRow}>
            <Text style={styles.companionMessage}>
              Nice work so far! Next up is your team standup — want a hand getting started?
            </Text>
            
            <View style={styles.progressCircle}>
               <Text style={styles.progressText}>{completedCount}/{completedCount + pendingCount}</Text>
               <Text style={styles.progressLabel}>DONE</Text>
            </View>
          </View>
          
          <Pressable style={styles.chatButton} onPress={() => navigation.navigate("AiConversations")}>
            <Text style={styles.chatButtonText}>💬 Chat with PUP</Text>
          </Pressable>
        </View>

        {/* ========== QUICK ACTIONS ========== */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsCard}>
            {[
              { icon: "✅", label: "Tasks", route: "Tasks" },
              { icon: "📋", label: "Hobbies", route: "TemplatesList" },
              { icon: "📅", label: "Schedule", route: "Schedule" },
              // { icon: "⏱", label: "Focus", route: "Timer" },
              { icon: "👥", label: "Friends", route: "Friends" },
              { icon: socialIcon, label: "Social", route: "SocialTask", isImage: true },
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
                    action.isImage && { overflow: "hidden" }
                  ]}
                >
                  {action.isImage ? (
                    <Image source={action.icon as any} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Text style={styles.quickActionEmoji}>{action.icon as string}</Text>
                  )}
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ========== TODAY'S TASKS ========== */}
        {/* ========== TODAY TASKS ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today</Text>
            <Pressable onPress={() => navigation.navigate("Tasks")}>
              <Text style={styles.sectionAction}>See all</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : todayOverrides.length > 0 ? (
            todayOverrides.slice(0, 5).map(({ template, override }) => {
              const priorityColor =
                PRIORITY_COLORS[template.priority ?? "none"] ?? PRIORITY_COLORS.none;
              const isCompleted = override.status === "COMPLETED";
              const isSkipped = override.status === "SKIPPED";
              const isDone = isCompleted || isSkipped;

              return (
                <Pressable
                  key={override.id}
                  style={styles.taskCard}
                  onPress={() => navigation.navigate("EditTask", { taskId: template.id })}
                >
                  <View style={[styles.taskCheckbox, isDone && styles.taskCheckboxDone]}>
                    {isDone && <Text style={styles.taskCheckIcon}>✓</Text>}
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                      {template.title}
                    </Text>
                    <Text style={styles.taskTime}>
                      {formatTime(override.instance_datetime)} • {template.categories?.[0]?.name || "Task"}
                    </Text>
                  </View>
                  <View style={[styles.taskDot, { backgroundColor: priorityColor }]} />
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyTasksCard}>
              <Text style={styles.emptyTasksText}>All caught up for today!</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>


    </SafeAreaView>
  );
};

export default HomeScreen;
