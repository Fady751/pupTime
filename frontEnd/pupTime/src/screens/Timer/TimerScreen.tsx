import React, { useMemo, useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import useTheme from "../../Hooks/useTheme";
import createStyles from "./TimerScreen.styles";
import TimerDial from "../../components/Timer/TimerDial";
import CountdownText from "../../components/Timer/CountdownText";
import TaskSelector from "../../components/Timer/TaskSelector";
import StartButton from "../../components/Timer/StartButton";
import GiveUpButton from "../../components/Timer/GiveUpButton";
import GiveUpDialog from "../../components/Timer/GiveUpDialog";
import { useTodayTasks } from "../../Hooks/useTasks";
import type { Task } from "../../types/task";

export type FocusSession = {
  taskId: number | null;
  duration: number;
  completed: boolean;
  abandoned: boolean;
  startTime: Date | null;
  endTime: Date | null;
  streakImpact: 1 | 0; // 1 for increase, 0 for reset
};

type SessionState = "IDLE" | "TASK_SELECTED" | "RUNNING" | "COMPLETED" | "ABANDONED";

const DURATIONS = [
  { label: "10 min", seconds: 10 * 60 },
  { label: "25 min", seconds: 25 * 60 },
  { label: "45 min", seconds: 45 * 60 },
];

const TimerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const user = useSelector((state: RootState) => state.user.data);
  const userId = user?.id ?? null;
  const { tasks: todayTasks } = useTodayTasks(userId);

  const [sessionState, setSessionState] = useState<SessionState>("IDLE");
  const [selectedDuration, setSelectedDuration] = useState<number>(DURATIONS[0].seconds);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(DURATIONS[0].seconds);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [showGiveUpDialog, setShowGiveUpDialog] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  // Navigation guard during running session
  useFocusEffect(
    useCallback(() => {
      const beforeRemove = navigation.addListener("beforeRemove", (e: any) => {
        if (sessionState !== "RUNNING") return;

        e.preventDefault();

        Alert.alert(
          "Stay focused",
          "Stay focused to keep your streak.",
          [
            { text: "Stay", style: "cancel" },
            {
              text: "Leave",
              style: "destructive",
              onPress: () => navigation.dispatch(e.data.action),
            },
          ]
        );
      });

      return () => beforeRemove();
    }, [navigation, sessionState])
  );

  // Reset remaining time when duration changes and not running
  useEffect(() => {
    if (sessionState === "RUNNING") return;
    setRemainingSeconds(selectedDuration);
  }, [selectedDuration, sessionState]);

  // Timer countdown
  useEffect(() => {
    if (sessionState !== "RUNNING") return;

    const startTime = new Date();
    setCurrentSession({
      taskId: selectedTask ? selectedTask.id : null,
      duration: selectedDuration,
      completed: false,
      abandoned: false,
      startTime,
      endTime: null,
      streakImpact: 0,
    });

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const endTime = new Date();
          setSessionState("COMPLETED");
          setStreak((s) => s + 1);
          setCurrentSession((session) =>
            session
              ? {
                  ...session,
                  completed: true,
                  abandoned: false,
                  endTime,
                  streakImpact: 1,
                }
              : session
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState, selectedDuration, selectedTask]);

  const handleSelectDuration = (seconds: number) => {
    if (sessionState === "RUNNING") return;
    setSelectedDuration(seconds);
  };

  const handleStart = () => {
    if (!selectedTask) {
      setShowTaskPicker(true);
      return;
    }
    setSessionState("RUNNING");
  };

  const handleConfirmGiveUp = () => {
    setShowGiveUpDialog(false);
    setSessionState("ABANDONED");
    setRemainingSeconds(selectedDuration);
    setStreak(0);
    const endTime = new Date();
    setCurrentSession((session) =>
      session
        ? {
            ...session,
            completed: false,
            abandoned: true,
            endTime,
            streakImpact: 0,
          }
        : session
    );
  };

  const handleTaskChosen = (task: Task) => {
    setSelectedTask(task);
    setSessionState("TASK_SELECTED");
    setShowTaskPicker(false);
  };

  const progress = 1 - remainingSeconds / selectedDuration;

  const statusLabel = (() => {
    switch (sessionState) {
      case "RUNNING":
        return "Stay focused to keep your streak.";
      case "COMPLETED":
        return "Great job! Task session completed.";
      case "ABANDONED":
        return "Session abandoned. Streak reset.";
      case "TASK_SELECTED":
        return "Press START to begin your focus session.";
      default:
        return "Select a task and duration to begin.";
    }
  })();

  const currentDurationLabel = DURATIONS.find((d) => d.seconds === selectedDuration)?.label;

  const hasCompleted = sessionState === "COMPLETED";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              style={styles.topIconButton}
              onPress={() => navigation.navigate("Schedule")}
            >
              <Text style={styles.topIconText}>📅</Text>
            </Pressable>
            <Pressable
              style={styles.topIconButton}
              onPress={() => navigation.navigate("Friends")}
            >
              <Text style={styles.topIconText}>👥</Text>
            </Pressable>
            <Pressable
              style={styles.topIconButton}
              onPress={() => console.log("Notifications pressed")}
            >
              <Text style={styles.topIconText}>🔔</Text>
            </Pressable>
          </View>
          <View style={styles.streakPill}>
            <Text>🔥</Text>
            <Text style={styles.streakPillText}>
              {streak > 0 ? `${streak} session streak` : "No streak yet"}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.center}>
            <TimerDial
              duration={selectedDuration}
              remainingTime={remainingSeconds}
              progress={progress}
              streak={streak}
            />

            <View style={styles.countdownWrapper}>
              <CountdownText remainingTime={remainingSeconds} />
            </View>

            {/* Duration chips */}
            <View style={styles.durationsRow}>
              {DURATIONS.map((d) => {
                const isActive = d.seconds === selectedDuration;
                return (
                  <Pressable
                    key={d.seconds}
                    onPress={() => handleSelectDuration(d.seconds)}
                    style={({ pressed }) => [
                      styles.durationChip,
                      isActive && styles.durationChipActive,
                      { opacity: pressed && !isActive ? 0.8 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        isActive && styles.durationChipTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Task Selector */}
          <TaskSelector
            task={selectedTask}
            onPressSelect={() => setShowTaskPicker(true)}
          />

          <View style={styles.bottomSection}>
            {sessionState !== "RUNNING" && (
              <StartButton
                disabled={!selectedTask}
                onPress={handleStart}
              />
            )}

            {sessionState === "RUNNING" && (
              <GiveUpButton onPress={() => setShowGiveUpDialog(true)} />
            )}

            <Text style={styles.statusText}>{statusLabel}</Text>

            {hasCompleted && (
              <View style={styles.successBanner}>
                <Text style={styles.successTextPrimary}>
                  Great job! Task session completed.
                </Text>
                <Text style={styles.successTextSecondary}>
                  🔥 Streak Increased!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Task picker simple modal */}
        {showTaskPicker && (
          <GiveUpDialog
            // Reuse dialog styles for a quick task picker background, but build custom content below if needed
            visible={false}
            onCancel={() => setShowTaskPicker(false)}
            onConfirm={() => setShowTaskPicker(false)}
          />
        )}

        {showTaskPicker && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "85%",
                maxHeight: "60%",
                borderRadius: 18,
                padding: 16,
                backgroundColor: colors.surface,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Select Task
              </Text>
              <ScrollView>
                {todayTasks && todayTasks.length > 0 ? (
                  todayTasks.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => handleTaskChosen(t)}
                      style={{
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 20, marginRight: 8 }}>
                        {t.emoji || "📌"}
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          color: colors.text,
                        }}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.secondaryText,
                      marginTop: 8,
                    }}
                  >
                    No tasks available for today.
                  </Text>
                )}
              </ScrollView>
              <Pressable
                style={{ marginTop: 12, alignSelf: "flex-end" }}
                onPress={() => setShowTaskPicker(false)}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.secondaryText,
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <GiveUpDialog
          visible={showGiveUpDialog}
          onCancel={() => setShowGiveUpDialog(false)}
          onConfirm={handleConfirmGiveUp}
        />
      </View>
    </SafeAreaView>
  );
};

export default TimerScreen;
