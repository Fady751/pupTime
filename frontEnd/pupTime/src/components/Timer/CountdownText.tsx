import React from "react";
import { Text, StyleSheet } from "react-native";

interface CountdownTextProps {
  remainingTime: number; // seconds
}

const formatTime = (seconds: number): string => {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const secs = (clamped % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export const CountdownText: React.FC<CountdownTextProps> = ({ remainingTime }) => {
  return <Text style={styles.time}>{formatTime(remainingTime)}</Text>;
};

const styles = StyleSheet.create({
  time: {
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
  },
});

export default CountdownText;
