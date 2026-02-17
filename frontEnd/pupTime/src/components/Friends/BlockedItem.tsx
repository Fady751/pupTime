import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createFriendsStyles from "./Friends.styles";
import type { Friend } from "../../types/friend";

interface BlockedItemProps {
  user: Friend;
  onUnblock: (user: Friend) => void;
}

export const BlockedItem: React.FC<BlockedItemProps> = ({ user, onUnblock }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createFriendsStyles(colors), [colors]);

  const initials = user.name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.row, styles.rowBorder]}>
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.avatar || initials || "👤"}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
      </View>
      <Pressable
        onPress={() => onUnblock(user)}
        style={({ pressed }) => [
          styles.dangerButton,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={styles.dangerButtonText}>Unblock</Text>
      </Pressable>
    </View>
  );
};

export default BlockedItem;
