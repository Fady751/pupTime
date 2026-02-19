import React, { useMemo } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Schedule } from "../../components/Schedule";
import { Task } from "../../types/task";
import useTheme from "../../Hooks/useTheme";
import { useTasks } from "../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const data = useSelector((state: RootState) => state.user.data);
  const { tasks, createTask } = useTasks(data?.id as number);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
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
    [colors]
  );

  const handleTaskPress = (task: Task) => {
    console.log("Task pressed:", task.title);
  };

  const onSave = async (task: Task) => {
    await createTask(task);
  }

  const handleAddTask = () => {
    navigation.navigate("AddTask", { onSave });
  };

  return (
    <View style={styles.container}>
      <Schedule tasks={tasks} onTaskPress={handleTaskPress} />

      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Text style={styles.addText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ScheduleScreen;
