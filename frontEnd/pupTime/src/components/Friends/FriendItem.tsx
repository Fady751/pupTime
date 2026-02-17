import React, { useMemo } from "react";
import { Pressable, Text, View, Alert } from "react-native";
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

  const handleMenuPress = () => {
    const actions = [] as { text: string; onPress?: () => void; style?: "destructive" | "default" }[];

    if (onRemove) {
      actions.push({
        text: "Remove Friend",
        onPress: () => onRemove(friend),
        style: "destructive",
      });
    }
    if (onBlock) {
      actions.push({
        text: "Block Friend",
        onPress: () => onBlock(friend),
        style: "destructive",
      });
    }

    actions.push({ text: "Cancel", style: "default" });

    Alert.alert("Friend options", undefined, actions);
  };

  const initials = friend.name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statusLabel = friend.status === "active" ? "Active" : friend.status === "offline" ? "Offline" : undefined;

  return (
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
        onPress={handleMenuPress}
        style={({ pressed }) => [
          styles.menuButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={styles.menuText}>⋮</Text>
      </Pressable>
    </Pressable>
  );
};

export default FriendItem;
