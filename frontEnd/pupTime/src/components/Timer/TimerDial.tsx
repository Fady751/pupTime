import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import useTheme from "../../Hooks/useTheme";

interface TimerDialProps {
  duration: number; // seconds
  remainingTime: number; // seconds
  progress: number; // 0..1
  streak: number;
}

const DIAL_SIZE = 220;
const STROKE_WIDTH = 12;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const TimerDial: React.FC<TimerDialProps> = ({
  duration,
  remainingTime,
  progress,
  streak,
}) => {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 24,
        },
        svgWrapper: {
          width: DIAL_SIZE,
          height: DIAL_SIZE,
          justifyContent: "center",
          alignItems: "center",
        },
        centerContent: {
          position: "absolute",
          alignItems: "center",
          justifyContent: "center",
        },
        focusLabel: {
          fontSize: 14,
          color: colors.secondaryText,
          marginBottom: 4,
        },
        durationText: {
          fontSize: 18,
          fontWeight: "700",
          color: colors.text,
        },
        streakRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 8,
        },
        streakText: {
          fontSize: 13,
          color: colors.secondaryText,
          marginLeft: 4,
          fontWeight: "500",
        },
      }),
    [colors]
  );

  const minutes = Math.round(duration / 60);
  const strokeDashoffset = CIRCUMFERENCE * (1 - Math.min(Math.max(progress, 0), 1));

  return (
    <View style={styles.container}>
      <View style={styles.svgWrapper}>
        <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
          <Circle
            cx={DIAL_SIZE / 2}
            cy={DIAL_SIZE / 2}
            r={RADIUS}
            stroke={colors.divider}
            strokeWidth={STROKE_WIDTH}
            fill={colors.surface}
          />
          <Circle
            cx={DIAL_SIZE / 2}
            cy={DIAL_SIZE / 2}
            r={RADIUS}
            stroke={colors.primary}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            rotation={-90}
            originX={DIAL_SIZE / 2}
            originY={DIAL_SIZE / 2}
          />
        </Svg>
        <View style={styles.centerContent}>
          <Text style={styles.focusLabel}>Focus Session</Text>
          <Text style={styles.durationText}>{minutes} min block</Text>
          <View style={styles.streakRow}>
            <Text>🔥</Text>
            <Text style={styles.streakText}>{streak > 0 ? `${streak} day streak` : "Start your streak"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default TimerDial;
