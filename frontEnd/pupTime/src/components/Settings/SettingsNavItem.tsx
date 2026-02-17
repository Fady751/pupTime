import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createSettingsStyles from "./Settings.styles";

interface SettingsNavItemProps {
  label: string;
  icon?: string;
  onPress: () => void;
  isFirst?: boolean;
}

export const SettingsNavItem: React.FC<SettingsNavItemProps> = ({
  label,
  icon,
  onPress,
  isFirst,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.itemRow,
        isFirst && styles.itemRowFirst,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.itemLeft}>
        {icon && <Text style={styles.itemIcon}>{icon}</Text>}
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <Text style={styles.arrowIcon}>{"›"}</Text>
    </Pressable>
  );
};

export default SettingsNavItem;
