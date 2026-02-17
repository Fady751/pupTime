import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createSettingsStyles from "./Settings.styles";

interface SettingsSelectItemProps {
  label: string;
  selectedValue: string;
  options: string[];
  onSelect: (value: string) => void;
  isFirst?: boolean;
}

export const SettingsSelectItem: React.FC<SettingsSelectItemProps> = ({
  label,
  selectedValue,
  options,
  onSelect,
  isFirst,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);

  const handlePress = () => {
    if (!options || options.length === 0) return;
    const currentIndex = options.indexOf(selectedValue);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % options.length;
    onSelect(options[nextIndex]);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.itemRow,
        isFirst && styles.itemRowFirst,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <View style={styles.itemValueContainer}>
        <Text style={styles.itemValue}>{selectedValue}</Text>
        <Text style={styles.selectChevron}>{"▾"}</Text>
      </View>
    </Pressable>
  );
};

export default SettingsSelectItem;
