import React, { useMemo, useState } from "react";
import { Pressable, Text, ActivityIndicator, Alert } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import useTheme from "../../Hooks/useTheme";
import createSettingsStyles from "./Settings.styles";
import { useLogout } from "../../Hooks/useLogout";
import ConfirmModal from "../Confirm/confirm";
import { deleteUser } from "../../services/userAuthServices/deleteUser";

export const DeleteAccountButton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);
  const user = useSelector((state: RootState) => state.user.data);
  const logout = useLogout();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    setVisible(false);
    setLoading(true);
    try {
      const response = await deleteUser({ id: user.id });
      if (response.success) {
        await logout();
      } else {
        Alert.alert("Error", response.message || "Failed to delete account.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while deleting your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ConfirmModal
        visible={visible}
        title="Delete Account"
        body="Are you sure you want to delete your account? This action is permanent and cannot be undone."
        confirmText="Delete Account"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setVisible(false)}
      />
      <Pressable
        style={({ pressed }) => [
          styles.deleteAccountButton,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => setVisible(true)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.error} size="small" />
        ) : (
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        )}
      </Pressable>
    </>
  );
};

export default DeleteAccountButton;
