import React from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./PermissionsIntro.styles";

interface Props {
  onNext?: () => void;
}

const PermissionsIntro: React.FC<Props> = ({ onNext }) => {
  const handleNext = () => {
    onNext?.();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />

      <View style={styles.progressWrapper}>
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

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

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Allow & Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PermissionsIntro;
