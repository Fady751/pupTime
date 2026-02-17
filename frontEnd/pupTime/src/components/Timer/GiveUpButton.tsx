import React, { useMemo } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import useTheme from "../../Hooks/useTheme";

interface GiveUpButtonProps {
  onPress: () => void;
}

export const GiveUpButton: React.FC<GiveUpButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          marginTop: 24,
          alignSelf: "center",
          paddingHorizontal: 24,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: "transparent",
        },
        text: {
          fontSize: 14,
          fontWeight: "700",
          color: colors.error,
        },
      }),
    [colors]
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={styles.text}>GIVE UP!</Text>
    </Pressable>
  );
};

export default GiveUpButton;
