import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import createStyles from "./ProfileScreen.styles";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
// import { useLogout } from "../../Hooks/useLogout";
import { BottomBar } from "../../components/BottomBar/BottomBar";
import useTheme from "../../Hooks/useTheme";
import { useTasksForSpecificDay } from "../../Hooks/useTasksForSpecificDay";
import { isTaskCompletedForDate } from "../../types/task";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
  none: "#6C8CFF",
};

const formatTaskTime = (task: any): string => {
  if (task.repetition && task.repetition.length > 0) {
    const rep = task.repetition[0];
    if (rep.time) {
      const t = new Date(rep.time);
      const h = t.getHours() % 12 || 12;
      const ampm = t.getHours() >= 12 ? "PM" : "AM";
      return `${h} ${ampm}`;
    }
  }
  return "All day";
};

const ProfileSettingsScreen = ( { navigation }: { navigation: any }) => {
  // const logout = useLogout();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data } = useSelector((state: RootState) => state.user);
  const { isConnected } = useSelector((state: RootState) => state.network);
  const today = useMemo(() => new Date(), []);
  const { tasks: dayTasks, pendingTasks, completedTasks } = useTasksForSpecificDay(data?.id ?? null, today);

  console.log("user data: ", data);
  const photo = data?.gender === 'female'? require("../../assets/avatar_Female.png"): require("../../assets/avatar_Male.png");

  return (
    <SafeAreaView style={styles.safe}>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>

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

          {isConnected && <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editTxt} onPress={() => navigation.navigate('EditProfile')}>Edit Profile</Text>
          </TouchableOpacity> }
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>25</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNum}>{data?.streak_cnt}🔥</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNum}>{pendingTasks.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* SCHEDULE */}
        <Text style={styles.sectionTitle}>Today's Schedule</Text>

        <View style={styles.scheduleCard}>
          {dayTasks.length > 0 ? (
            dayTasks.map((task) => {
              const color = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.none;
              const completed = isTaskCompletedForDate(task, today);
              return (
                <View key={task.id} style={styles.sessionRow}>
                  <Text style={styles.time}>{formatTaskTime(task)}</Text>
                  <View
                    style={[
                      styles.sessionBlock,
                      { backgroundColor: color, opacity: completed ? 0.5 : 1 },
                    ]}
                  >
                    <Text style={styles.sessionText}>
                      {task.emoji ? `${task.emoji} ` : ""}{task.title}
                      {completed ? " ✓" : ""}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={{ color: colors.secondaryText, textAlign: "center", paddingVertical: 12 }}>
              No tasks for today 🌤️
            </Text>
          )}
        </View>

        

      </ScrollView>

      <BottomBar current="Home" navigation={navigation} />

    </SafeAreaView>
  );
};

export default ProfileSettingsScreen;