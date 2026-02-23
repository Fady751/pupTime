import React, { useState } from "react";
import { View, Text, TouchableOpacity, StatusBar, Platform, Alert, PermissionsAndroid } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { IntroStackParamList } from "../IntroNavigator";
import useTheme from "../../../Hooks/useTheme";
import createStyles from "./styles";
import StepIndicator from "../StepIndicator";
import { requestNotifications, RESULTS } from "react-native-permissions";
import BatteryPermissionModal from "../../../components/BatteryPermissionModal/BatteryPermissionModal";

const STEP_LABELS = ["Mic", "Notifications", "Interests"];

type Props = {
  navigation: NativeStackNavigationProp<IntroStackParamList, 'NotificationPermission'>;
};

const NotificationPermission: React.FC<Props> = ({ navigation }) => {
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestNotificationPermission = async () => {
    try {
      setIsRequesting(true);

      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Android 13+ requires POST_NOTIFICATIONS permission
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          navigation.navigate('FreeTimeHabits');
        } else if (result === PermissionsAndroid.RESULTS.DENIED) {
          Alert.alert(
            "Permission Denied",
            "You can enable notifications later in your device settings.",
            [{ text: "Continue", onPress: () => navigation.navigate('FreeTimeHabits') }]
          );
        } else {
          Alert.alert(
            "Permission Blocked",
            "Notifications are blocked. Please enable them in your device settings.",
            [{ text: "Continue", onPress: () => navigation.navigate('FreeTimeHabits') }]
          );
        }
      } else if (Platform.OS === 'ios') {
        // iOS notification permission
        const { status } = await requestNotifications(['alert', 'badge', 'sound']);
        
        switch (status) {
          case RESULTS.GRANTED:
            navigation.navigate('FreeTimeHabits');
            break;
          case RESULTS.DENIED:
            Alert.alert(
              "Permission Denied",
              "You can enable notifications later in your device settings.",
              [{ text: "Continue", onPress: () => navigation.navigate('FreeTimeHabits') }]
            );
            break;
          case RESULTS.BLOCKED:
            Alert.alert(
              "Permission Blocked",
              "Notifications are blocked. Please enable them in your device settings.",
              [{ text: "Continue", onPress: () => navigation.navigate('FreeTimeHabits') }]
            );
            break;
          default:
            navigation.navigate('FreeTimeHabits');
        }
      } else {
        // Android < 13 doesn't need explicit notification permission
        navigation.navigate('FreeTimeHabits');
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      navigation.navigate('FreeTimeHabits');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('FreeTimeHabits');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BatteryPermissionModal />
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <StepIndicator
        currentStep={2}
        totalSteps={3}
        colors={colors}
        labels={STEP_LABELS}
      />

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

        <TouchableOpacity 
          style={[styles.button, isRequesting && styles.buttonDisabled]} 
          onPress={requestNotificationPermission}
          disabled={isRequesting}
        >
          <Text style={styles.buttonText}>
            {isRequesting ? "Requesting..." : "Allow & Continue"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default NotificationPermission;
