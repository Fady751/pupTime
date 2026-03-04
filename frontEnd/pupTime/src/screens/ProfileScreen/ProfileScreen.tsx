import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import createStyles from "./ProfileScreen.styles";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { BottomBar } from "../../components/BottomBar/BottomBar";
import useTheme from "../../Hooks/useTheme";
import { useTasks } from "../../Hooks/useTasks";
import {
  type TaskTemplate,
  type TaskOverride,
  toLocalDateString,
} from "../../types/task";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
  none: "#6C8CFF",
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
};

/** Flatten templates → overrides that fall on a specific date string (YYYY-MM-DD). */
const getOverridesForDate = (
  tasks: TaskTemplate[],
  dateStr: string,
): { template: TaskTemplate; override: TaskOverride }[] => {
  const result: { template: TaskTemplate; override: TaskOverride }[] = [];
  for (const tpl of tasks) {
    if (tpl.is_deleted) continue;
    for (const ov of tpl.overrides ?? []) {
      if (ov.is_deleted) continue;
      const ovDate = toLocalDateString(ov.instance_datetime, tpl.timezone ?? undefined);
      if (ovDate === dateStr) {
        result.push({ template: tpl, override: ov });
      }
    }
  }
  result.sort(
    (a, b) =>
      new Date(a.override.instance_datetime).getTime() -
      new Date(b.override.instance_datetime).getTime(),
  );
  return result;
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

const ProfileSettingsScreen = ({ navigation }: { navigation: any }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data } = useSelector((state: RootState) => state.user);
  const { isConnected } = useSelector((state: RootState) => state.network);
  const userId = data?.id;

  const { tasks } = useTasks(userId!);

  const todayStr = useMemo(() => toLocalDateString(new Date().toISOString()), []);

  const todayOverrides = useMemo(
    () => (userId ? getOverridesForDate(tasks, todayStr) : []),
    [tasks, todayStr, userId],
  );

  const pendingCount = useMemo(
    () => todayOverrides.filter((o) => o.override.status === "PENDING").length,
    [todayOverrides],
  );
  const completedCount = useMemo(
    () => todayOverrides.filter((o) => o.override.status === "COMPLETED").length,
    [todayOverrides],
  );

  const photo =
    data?.gender === "female"
      ? require("../../assets/avatar_Female.png")
      : require("../../assets/avatar_Male.png");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>←</Text>
            </Pressable>
          </View>
        </View>

        {/* USER CARD */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <Image source={photo} style={styles.avatar} />
            </View>
            <View style={styles.onlineDot} />
          </View>

          <Text style={styles.name}>{data?.username}</Text>
          <Text style={styles.email}>{data?.email}</Text>

          {isConnected && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Text style={styles.editTxt}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{data?.streak_cnt ?? 0}🔥</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNum}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNum}>{completedCount}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>

        {/* SCHEDULE */}
        <Text style={styles.sectionTitle}>Today's Schedule</Text>

        <View style={styles.scheduleCard}>
          {todayOverrides.length > 0 ? (
            todayOverrides.map(({ template, override }) => {
              const color =
                PRIORITY_COLORS[template.priority ?? "none"] ?? PRIORITY_COLORS.none;
              const isCompleted = override.status === "COMPLETED";
              const isSkipped = override.status === "SKIPPED";
              const isDone = isCompleted || isSkipped;

              return (
                <Pressable
                  key={override.id}
                  style={styles.sessionRow}
                  onPress={() => navigation.navigate("Tasks")}
                >
                  <Text style={styles.time}>
                    {formatTime(override.instance_datetime)}
                  </Text>
                  <View
                    style={[
                      styles.sessionBlock,
                      { backgroundColor: color, opacity: isDone ? 0.55 : 1 },
                    ]}
                  >
                    <Text style={styles.sessionText}>
                      {template.emoji ? `${template.emoji} ` : ""}
                      {template.title}
                      {isCompleted ? " ✓" : ""}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptySchedule}>
              <Text style={styles.emptyEmoji}>🌤️</Text>
              <Text style={styles.emptyText}>No tasks for today</Text>
            </View>
          )}
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomBar current="Profile" navigation={navigation} />
    </SafeAreaView>
  );
};

export default ProfileSettingsScreen;