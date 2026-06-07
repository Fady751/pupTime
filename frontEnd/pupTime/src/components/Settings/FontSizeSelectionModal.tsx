import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { AppColors } from "../../constants/colors";

interface FontSizeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  currentSize: "small" | "medium" | "large";
  onSelectSize: (size: "small" | "medium" | "large") => void;
  colors: AppColors;
}

export const FontSizeSelectionModal: React.FC<FontSizeSelectionModalProps> = ({
  visible,
  onClose,
  currentSize,
  onSelectSize,
  colors,
}) => {
  const options: { value: "small" | "medium" | "large"; label: string; previewSize: number }[] = [
    { value: "small", label: "Small", previewSize: 13 },
    { value: "medium", label: "Medium", previewSize: 16 },
    { value: "large", label: "Large", previewSize: 20 },
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Choose Font Size</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Adjust the text size for readability
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const isSelected = option.value === currentSize;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionRow,
                    { borderBottomColor: colors.divider + "33" },
                  ]}
                  onPress={() => {
                    onSelectSize(option.value);
                    onClose();
                  }}
                >
                  <View style={option.value === "small" ? styles.optionLeftSmall : option.value === "medium" ? styles.optionLeftMedium : styles.optionLeftLarge}>
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color: colors.text,
                          fontSize: option.previewSize,
                          fontWeight: isSelected ? "800" : "600",
                        },
                      ]}
                    >
                      {option.label}
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
    maxHeight: 240,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionLeftSmall: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
  },
  optionLeftMedium: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
  },
  optionLeftLarge: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
  },
  optionLabel: {
    // styled inline
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

export default FontSizeSelectionModal;
