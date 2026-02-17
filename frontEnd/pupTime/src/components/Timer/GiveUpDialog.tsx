import React, { useMemo } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import useTheme from "../../Hooks/useTheme";

interface GiveUpDialogProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const GiveUpDialog: React.FC<GiveUpDialogProps> = ({
  visible,
  onCancel,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          alignItems: "center",
        },
        content: {
          width: "80%",
          borderRadius: 18,
          padding: 20,
          backgroundColor: colors.surface,
        },
        title: {
          fontSize: 18,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 8,
        },
        message: {
          fontSize: 14,
          color: colors.secondaryText,
          marginBottom: 20,
        },
        actionsRow: {
          flexDirection: "row",
          justifyContent: "flex-end",
        },
        actionButton: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 999,
        },
        backText: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.secondaryText,
        },
        giveUpText: {
          fontSize: 14,
          fontWeight: "700",
          color: colors.error,
        },
      }),
    [colors]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Give up session?</Text>
          <Text style={styles.message}>
            GIVE UP will cause you to lose your streak.
          </Text>
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.actionButton}
              onPress={onCancel}
            >
              <Text style={styles.backText}>BACK</Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={onConfirm}
            >
              <Text style={styles.giveUpText}>GIVE UP</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default GiveUpDialog;
