import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import createStyles from "./ProfileScreen.styles";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useLogout } from "../../Hooks/logout";
import { BottomBar } from "../../components/BottomBar/BottomBar";
import useTheme from "../../Hooks/useTheme";
// import EditProfile from "./EditProfile/EditProfile";

const schedule = [
  { time: "8 AM", title: "Lecture", color: "#6C8CFF" },
  { time: "9 AM", title: "Focus", color: "#FF7A59" },
  { time: "10 AM", title: "Workout", color: "#00B894" },
  { time: "11 AM", title: "Study", color: "#FDCB6E" },
];

const ProfileSettingsScreen = ( { navigation }: { navigation: any }) => {
  const logout = useLogout();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data } = useSelector((state: RootState) => state.user);

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

          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editTxt} onPress={() => navigation.navigate('EditProfile')}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>25</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>

          {/* <View style={styles.statCard}>
            <Text style={styles.statNum}>12</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View> */}

          <View style={styles.statCard}>
            <Text style={styles.statNum}>{data?.streak_cnt}🔥</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* SCHEDULE */}
        <Text style={styles.sectionTitle}>Today's Schedule</Text>

        <View style={styles.scheduleCard}>
          {schedule.map((item, i) => (
            <View key={i} style={styles.sessionRow}>
              <Text style={styles.time}>{item.time}</Text>

              <View style={[styles.sessionBlock, { backgroundColor: item.color }]}>
                <Text style={styles.sessionText}>{item.title}</Text>
              </View>
            </View>
          ))}
        </View>

        

      </ScrollView>

      <BottomBar current="Home" navigation={navigation} />

    </SafeAreaView>
  );
};

export default ProfileSettingsScreen;