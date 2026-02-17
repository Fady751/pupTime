import React, { ReactNode, useMemo } from "react";
import { View, Text } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createSettingsStyles from "./Settings.styles";

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);

  return (
    <View style={styles.sectionWrapper}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
};

export default SettingsSection;
