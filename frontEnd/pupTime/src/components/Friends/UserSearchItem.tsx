import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createFriendsStyles from "./Friends.styles";
import type { FriendRequest } from "../../types/friend";

interface UserSearchItemProps {
  request: FriendRequest;
  onAdd: (request: FriendRequest) => void;
}

export const UserSearchItem: React.FC<UserSearchItemProps> = ({ request, onAdd }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createFriendsStyles(colors), [colors]);

  const initials = request.name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isSent = request.requestStatus === "sent";

  return (
    <View style={[styles.row, styles.rowBorder]}>
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{request.avatar || initials || "👤"}</Text>
        </View>
        <Text style={styles.name}>{request.name}</Text>
      </View>
      <Pressable
        disabled={isSent}
        onPress={() => onAdd(request)}
        style={({ pressed }) => [
          styles.primaryButton,
          isSent && styles.primaryButtonDisabled,
          { opacity: pressed && !isSent ? 0.8 : 1 },
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isSent ? "Request Sent ✓" : "+ Add"}
        </Text>
      </Pressable>
    </View>
  );
};

export default UserSearchItem;
