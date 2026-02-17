import React, { useMemo } from "react";
import { View, Text, Switch } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createSettingsStyles from "./Settings.styles";

interface SettingsSwitchItemProps {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  isFirst?: boolean;
}

export const SettingsSwitchItem: React.FC<SettingsSwitchItemProps> = ({
  label,
  value,
  onToggle,
  isFirst,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.itemRow,
        isFirst && styles.itemRowFirst,
      ]}
    >
      <Text style={styles.itemLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        thumbColor={value ? colors.primary : "#f4f3f4"}
        trackColor={{ false: colors.divider, true: colors.primary + "33" }}
      />
    </View>
  );
};

export default SettingsSwitchItem;
