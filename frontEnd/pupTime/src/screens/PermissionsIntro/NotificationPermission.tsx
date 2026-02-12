import React from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./NotificationPermission.styles";

interface Props {
  onNext?: () => void;
}

const NotificationPermission: React.FC<Props> = ({ onNext }) => {
  const handleNext = () => {
    // هنا بعدين ممكن تحط request notification permission
    onNext?.();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />

      {/* Progress Indicator */}
      <View style={styles.progressWrapper}>
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* Welcome Section */}
      <View style={styles.heroSection}>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.brand}>PUPTime</Text>
      </View>

      {/* Permission Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Allow Notifications</Text>

        <Text style={styles.cardText}>
          PUPTime sends you reminders to stay on track and
          {"\n"}help you manage your day effectively.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Allow & Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default NotificationPermission;
