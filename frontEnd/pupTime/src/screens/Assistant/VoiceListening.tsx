import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./VoiceListening.styles";
type Mode = "voice" | "text";

const AssistantInputScreen = () => {
  const [mode, setMode] = useState<Mode>("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState("");

  const toggleRecording = () => {
    setIsRecording(prev => !prev);
    // هنا بعدين هنربط Voice API
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🐶</Text>
        <Text style={styles.title}>Hi, I'm Pup</Text>
        <Text style={styles.subtitle}>How would you like to add your task?</Text>
      </View>

      {/* Mode Switch */}
      <View style={styles.switchRow}>
        <TouchableOpacity
          style={[styles.switchBtn, mode === "voice" && styles.activeSwitch]}
          onPress={() => setMode("voice")}
        >
          <Text style={styles.switchText}>🎤 Voice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switchBtn, mode === "text" && styles.activeSwitch]}
          onPress={() => setMode("text")}
        >
          <Text style={styles.switchText}>⌨️ Text</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {mode === "voice" ? (
          <>
            <TouchableOpacity
              style={[
                styles.micCircle,
                isRecording && styles.micActive,
              ]}
              onPress={toggleRecording}
              activeOpacity={0.85}
            >
              <Text style={styles.micIcon}>🎤</Text>
            </TouchableOpacity>

            <Text style={styles.status}>
              {isRecording ? "Listening..." : "Tap to start speaking"}
            </Text>
          </>
        ) : (
          <>
            <TextInput
              placeholder="Type your task here..."
              value={text}
              onChangeText={setText}
              multiline
              style={styles.input}
            />

            <Text style={styles.status}>
              Example: "Meeting tomorrow at 10 AM"
            </Text>
          </>
        )}
      </View>

      {/* Done */}
      <TouchableOpacity style={styles.doneBtn}>
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default AssistantInputScreen;
