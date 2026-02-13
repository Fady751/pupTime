import React, { useState } from "react";
import { View, Text, TouchableOpacity, StatusBar, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { IntroStackParamList } from "../IntroNavigator";
import useTheme from "../../../Hooks/useTheme";
import createStyles from "./styles";
import StepIndicator from "../StepIndicator";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";

const STEP_LABELS = ["Mic", "Notifications", "Interests"];

type Props = {
  navigation: NativeStackNavigationProp<IntroStackParamList, 'PermissionsIntro'>;
};

const PermissionsIntro: React.FC<Props> = ({ navigation }) => {
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestMicrophonePermission = async () => {
    try {
      setIsRequesting(true);
      
      const permission = Platform.select({
        ios: PERMISSIONS.IOS.MICROPHONE,
        android: PERMISSIONS.ANDROID.RECORD_AUDIO,
      });

      if (!permission) {
        navigation.navigate('NotificationPermission');
        return;
      }

      const result = await request(permission);

      switch (result) {
        case RESULTS.GRANTED:
          navigation.navigate('NotificationPermission');
          break;
        case RESULTS.DENIED:
          Alert.alert(
            "Permission Denied",
            "You can enable microphone access later in your device settings.",
            [{ text: "Continue", onPress: () => navigation.navigate('NotificationPermission') }]
          );
          break;
        case RESULTS.BLOCKED:
          Alert.alert(
            "Permission Blocked",
            "Microphone access is blocked. Please enable it in your device settings for voice features.",
            [{ text: "Continue", onPress: () => navigation.navigate('NotificationPermission') }]
          );
          break;
        default:
          navigation.navigate('NotificationPermission');
      }
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      navigation.navigate('NotificationPermission');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('NotificationPermission');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <StepIndicator
        currentStep={1}
        totalSteps={3}
        colors={colors}
        labels={STEP_LABELS}
      />

      <View style={styles.heroSection}>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.brand}>PUPTime</Text>

        <Text style={styles.subtitle}>
          Your AI assistant to organize your time,
          {"\n"}stay focused, and beat procrastination.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Microphone Access</Text>

        <Text style={styles.cardText}>
          PUP uses voice input so you can quickly tell it
          what you want to do without typing.
        </Text>

        <TouchableOpacity 
          style={[styles.button, isRequesting && styles.buttonDisabled]} 
          onPress={requestMicrophonePermission}
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

export default PermissionsIntro;
