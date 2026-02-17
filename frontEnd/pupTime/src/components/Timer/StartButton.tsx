import React, { useMemo } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import useTheme from "../../Hooks/useTheme";

interface StartButtonProps {
  disabled?: boolean;
  onPress: () => void;
}

export const StartButton: React.FC<StartButtonProps> = ({ disabled, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          marginTop: 32,
          alignSelf: "center",
          paddingHorizontal: 48,
          paddingVertical: 14,
          borderRadius: 999,
          backgroundColor: disabled ? colors.divider : colors.primary,
        },
        text: {
          color: colors.primaryText,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: 1.2,
        },
      }),
    [colors, disabled]
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed && !disabled ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.text}>START</Text>
    </Pressable>
  );
};

export default StartButton;
