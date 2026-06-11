import React, { useMemo, useState } from "react";
import { Pressable, Text, View, Alert, Modal, TouchableOpacity } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createFriendsStyles from "./Friends.styles";
import type { Friend } from "../../types/friend";

interface FriendItemProps {
  friend: Friend;
  onPress?: (friend: Friend) => void;
  onRemove?: (friend: Friend) => void;
  onBlock?: (friend: Friend) => void;
}

export const FriendItem: React.FC<FriendItemProps> = ({
  friend,
  onPress,
  onRemove,
  onBlock,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createFriendsStyles(colors), [colors]);
  const [menuVisible, setMenuVisible] = useState(false);

  const initials = friend.name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statusLabel = friend.status === "active" ? "Active" : friend.status === "offline" ? "Offline" : undefined;

  return (
    <>
      <Pressable
        onPress={() => onPress?.(friend)}
        style={({ pressed }) => [
          styles.row,
          styles.rowBorder,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={styles.left}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{friend.avatar || initials || "👤"}</Text>
          </View>
          <View>
            <Text style={styles.name}>{friend.name}</Text>
            {statusLabel && <Text style={styles.status}>{statusLabel}</Text>}
          </View>
        </View>
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={({ pressed }) => [
            styles.menuButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={styles.menuText}>⋮</Text>
        </Pressable>
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Friend Options</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setMenuVisible(false);
                  Alert.alert(
                    "Reported",
                    `Thank you. We have received your report regarding ${friend.name} and will review it shortly.`,
                    [{ text: "OK" }]
                  );
                }}
              >
                <Text style={styles.destructiveActionText}>Report Friend</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setMenuVisible(false);
                  if (onBlock) {
                    onBlock(friend);
                  }
                }}
              >
                <Text style={styles.destructiveActionText}>Block Friend</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={styles.standardActionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default FriendItem;
