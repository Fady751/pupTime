import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./ProfileScreen.styles";
import EditProfile from "./EditProfile";

const { width } = Dimensions.get("window");

const schedule = [
  { time: "8 AM", title: "Lecture", color: "#6C8CFF" },
  { time: "9 AM", title: "Focus", color: "#FF7A59" },
  { time: "10 AM", title: "Workout", color: "#00B894" },
  { time: "11 AM", title: "Study", color: "#FDCB6E" },
];

const ProfileSettingsScreen = () => {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [open, setOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({
    username: "Omar Khaled",
    email: "omar@email.com",
    gender: "",
    birth_day: "",
  });

  const openMenu = () => {
    setOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  const handleLogout = () => {
    console.log("Logout pressed");
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
  };

  const handleEditSuccess = (updatedUser: any) => {
    setUserInfo({
      username: updatedUser.username || userInfo.username,
      email: updatedUser.email || userInfo.email,
      gender: updatedUser.gender || userInfo.gender,
      birth_day: updatedUser.birth_day || userInfo.birth_day,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>

          {/* SETTINGS BUTTON */}
          <TouchableOpacity onPress={openMenu}>
            <Text style={styles.sett{userInfo.username}</Text>
          <Text style={styles.email}>{userInfo.email}</Text>

          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => setEditModalOpen(true)}
          
        {/* USER CARD */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar} />
            </View>
            <View style={styles.onlineDot} />
          </View>

          <Text style={styles.name}>Omar Khaled</Text>
          <Text style={styles.email}>omar@email.com</Text>

          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editTxt}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>25</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNum}>12</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNum}>5🔥</Text>
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

        <TouchableOpacity style={styles.pupBtn}>
          <Text style={styles.pupTxt}>PUP</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* RIGHT SLIDE MENU */}
      {open && (
        <Animated.View
          style={[
            styles.sideMenu,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <TouchableOpacity onPress={closeMenu}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <TouchableOpacity style={styles.optionItem}>
              <Text style={styles.optionText}>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem}>
              <Text style={styles.optionText}>Privacy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem}>
              <Text style={styles.optionText}>Help & Support</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <Text style={styles.icon}>🎵</Text>
        <Text style={styles.icon}>🌍</Text>
        <Text style={styles.iconActive}>🏠</Text>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editModalOpen}
        animationType="slide"
        onRequestClose={handleEditClose}
      >
        <EditProfile
          currentUser={userInfo}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      </Modal>
        <Text style={styles.icon}>⏱</Text>
        <Text style={styles.icon}>⚙️</Text>
      </View>
    </SafeAreaView>
  );
};

export default ProfileSettingsScreen;