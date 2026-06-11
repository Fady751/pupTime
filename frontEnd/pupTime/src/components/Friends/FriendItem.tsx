import React, { useMemo, useState } from "react";
import { Pressable, Text, View, Alert, Modal, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createFriendsStyles from "./Friends.styles";
import type { Friend } from "../../types/friend";
import { reportUser } from "../../services/friendshipService";

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
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const handleConfirmReport = async () => {
    const reason = reportReason.trim();
    if (!reason) return;

    setReporting(true);
    try {
      await reportUser(friend.id, reason);
      setReportModalVisible(false);
      setReportReason("");
      Alert.alert(
        "Report Submitted",
        `Thank you. We have received your report regarding ${friend.name} and will review it shortly.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Failed to submit report. Please try again later.",
        [{ text: "OK" }]
      );
    } finally {
      setReporting(false);
    }
  };

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
                  setReportModalVisible(true);
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

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!reporting) {
            setReportModalVisible(false);
            setReportReason("");
          }
        }}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => {
            if (!reporting) {
              setReportModalVisible(false);
              setReportReason("");
            }
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Report {friend.name}</Text>
            
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, color: colors.secondaryText, fontWeight: "600" }}>
                What is the reason for reporting?
              </Text>
              <TextInput
                style={{
                  width: '100%',
                  minHeight: 80,
                  maxHeight: 200,
                  borderColor: colors.border,
                  borderWidth: 1.5,
                  borderRadius: 12,
                  padding: 12,
                  color: colors.text,
                  backgroundColor: colors.background,
                  textAlignVertical: 'top',
                  fontSize: 15,
                }}
                placeholder="Type your reason here..."
                placeholderTextColor={colors.secondaryText}
                multiline={true}
                value={reportReason}
                onChangeText={setReportReason}
                editable={!reporting}
              />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setReportModalVisible(false);
                  setReportReason("");
                }}
                disabled={reporting}
              >
                <Text style={styles.standardActionText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, (reporting || !reportReason.trim()) && styles.primaryButtonDisabled]}
                onPress={handleConfirmReport}
                disabled={reporting || !reportReason.trim()}
              >
                {reporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default FriendItem;
