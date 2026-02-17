import React, { useMemo } from "react";
import { Pressable, Text } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createSettingsStyles from "./Settings.styles";
import { useLogout } from "../../Hooks/useLogout";

export const LogoutButton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);
  const logout = useLogout();

  const handlePress = async () => {
    await logout();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.logoutButton,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={handlePress}
    >
      <Text style={styles.logoutText}>Log Out</Text>
    </Pressable>
  );
};

export default LogoutButton;
