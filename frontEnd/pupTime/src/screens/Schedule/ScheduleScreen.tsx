import React, { useMemo, useState, useCallback, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Schedule } from "../../components/Schedule";
import { type TaskTemplate, floorDateByTimezone } from "../../types/task";
import useTheme from "../../Hooks/useTheme";
import { useTasks } from "../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const data = useSelector((state: RootState) => state.user.data);
  const route = useRoute();

  // Today's date string in local timezone
  const [dateStr, setDateSrt] = useState(floorDateByTimezone(new Date().toISOString()));

  const [nextDateStr, setNextDateStr] = useState(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return floorDateByTimezone(next.toISOString());
  });

  const current_filter = useMemo(() => {
    return {
      start_date: dateStr,
      end_date: nextDateStr,
    };
  }, [dateStr, nextDateStr]);

  const { tasks, loading, filter, changeOverride, applyFilter } = useTasks(
    data?.id as number,
    current_filter,
  );

  const [togglingIds, setTogglingIds] = useState<string[]>([]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        addButton: {
          position: "absolute",
          bottom: 30,
          right: 20,
          width: 65,
          height: 65,
          borderRadius: 32,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
          elevation: 5,
        },
        addText: {
          color: colors.primaryText,
          fontSize: 30,
          marginTop: -2,
        },
      }),
    [colors],
  );

  /* ── Month change → update the store filter ──────── */
  const handleMonthChange = useCallback(
    async (startDate: string, endDate: string) => {
      setDateSrt(startDate);
      setNextDateStr(endDate);
      await applyFilter({
        ...filter,
        start_date: startDate,
        end_date: endDate,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleTaskPress = (template: TaskTemplate) => {
    navigation.navigate("EditTask", { taskId: template.id });
  };

  const handleCompleteToggle = async (
    templateId: string,
    overrideId: string,
    currentStatus: string,
  ) => {
    if (togglingIds.includes(overrideId)) return;

    setTogglingIds((prev) => [...prev, overrideId]);
    try {
      await changeOverride(templateId, overrideId, {
        status: currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED",
      });
    } finally {
      setTogglingIds((prev) => prev.filter((id) => id !== overrideId));
    }
  };

  const handleAddTask = () => {
    navigation.navigate("AddTask");
  };

  return (
    <View style={styles.container}>
      <Schedule
        tasks={tasks}
        loading={loading}
        onMonthChange={handleMonthChange}
        onTaskPress={handleTaskPress}
        onCompleteToggle={handleCompleteToggle}
        isToggling={(overrideId) => togglingIds.includes(overrideId)}
      />

      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Text style={styles.addText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ScheduleScreen;
