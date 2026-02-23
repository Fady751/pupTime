import React, { useMemo } from "react";
import { Pressable, Text } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createSettingsStyles from "./Settings.styles";
import { useLogout } from "../../Hooks/useLogout";
import ConfirmModal from "../Confirm/confirm";
import { getPendingSyncItems } from "../../DB";

export const LogoutButton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);
  const logout = useLogout();
  const [visible, setVisible] = React.useState(false);

  const handlePress = async () => {
      const queue = await getPendingSyncItems();
      if(queue.length > 0) {
        setVisible(true);
      }
      else {
        await logout();
      }
  };

  return (
    <>
      {visible && (
        <ConfirmModal
          visible={visible}
          title="Confirm Logout"
          body="Are you sure you want to log out? You have unsynced data that will be lost if you log out now. Please sync your data before logging out to avoid losing any changes."
          onConfirm={async () => {
            setVisible(false);
            await logout();
          }}
          onCancel={() => setVisible(false)}
        />
      )}
      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={handlePress}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </>
  );
};

export default LogoutButton;
