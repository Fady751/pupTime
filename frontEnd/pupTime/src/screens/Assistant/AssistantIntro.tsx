import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./AssistantIntro.styles";

type Mode = "voice" | "text" | null;

interface Props {
  onContinue?: (mode: Mode) => void;
}

const AssistantIntro: React.FC<Props> = ({ onContinue }) => {
  const [selectedMode, setSelectedMode] = useState<Mode>(null);

  const handleSelect = (mode: Mode) => {
    setSelectedMode(mode);
  };

  const handleContinue = () => {
    if (selectedMode && onContinue) {
      onContinue(selectedMode);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🐶</Text>
        <Text style={styles.appName}>PupTime Assistant</Text>
      </View>

      {/* Message */}
      <View style={styles.messageCard}>
        <Text style={styles.title}>Hi, I'm Pup 👋</Text>

        <Text style={styles.subtitle}>
          Let’s plan your day together.
        </Text>

        <Text style={styles.description}>
          Choose how you'd like to tell me your tasks.
        </Text>
      </View>

      {/* Options */}
      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleSelect("voice")}
          style={[
            styles.actionButton,
            selectedMode === "voice" && styles.selectedButton,
          ]}
        >
          <Text style={styles.icon}>🎤</Text>
          <Text style={styles.actionTitle}>Voice</Text>
          <Text style={styles.actionDesc}>
            Speak naturally with Pup
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleSelect("text")}
          style={[
            styles.actionButton,
            selectedMode === "text" && styles.selectedButton,
          ]}
        >
          <Text style={styles.icon}>⌨️</Text>
          <Text style={styles.actionTitle}>Text</Text>
          <Text style={styles.actionDesc}>
            Type tasks manually
          </Text>
        </TouchableOpacity>
      </View>

      {/* Continue يظهر بعد الاختيار */}
      {selectedMode && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default AssistantIntro;
