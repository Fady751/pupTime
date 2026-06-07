import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { AppColors, ColorSchemeOption, COLOR_SCHEME_PRESETS } from "../../constants/colors";

interface ColorSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  currentScheme: ColorSchemeOption;
  onSelectScheme: (scheme: ColorSchemeOption) => void;
  colors: AppColors;
  isDark: boolean;
}

export const ColorSelectionModal: React.FC<ColorSelectionModalProps> = ({
  visible,
  onClose,
  currentScheme,
  onSelectScheme,
  colors,
  isDark,
}) => {
  const options = Object.keys(COLOR_SCHEME_PRESETS) as ColorSchemeOption[];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Choose Theme Color</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Select your preferred primary color scheme
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {options.map((schemeKey) => {
              const preset = COLOR_SCHEME_PRESETS[schemeKey];
              const isSelected = schemeKey === currentScheme;
              const previewColor = isDark ? preset.dark.primary : preset.light.primary;

              return (
                <Pressable
                  key={schemeKey}
                  style={[
                    styles.optionRow,
                    { borderBottomColor: colors.divider + "33" },
                  ]}
                  onPress={() => {
                    onSelectScheme(schemeKey);
                    onClose();
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: previewColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: colors.text, fontWeight: isSelected ? "800" : "600" },
                      ]}
                    >
                      {preset.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <Text style={[styles.checkMark, { color: colors.primary }]}>
                      ✓
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: colors.primaryText }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    maxHeight: 280,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionLabel: {
    fontSize: 16,
  },
  checkMark: {
    fontSize: 18,
    fontWeight: "900",
  },
  closeButton: {
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
});

export default ColorSelectionModal;
