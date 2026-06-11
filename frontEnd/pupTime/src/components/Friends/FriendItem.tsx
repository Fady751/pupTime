import React, { useMemo, useState } from "react";
import { Pressable, Text, View, Alert, Modal, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createFriendsStyles from "./Friends.styles";
import type { Friend } from "../../types/friend";
import { reportUser, blockUser } from "../../services/friendshipService";

interface FriendItemProps {
  friend: Friend;
  onPress?: (friend: Friend) => void;
  onRemove?: (friend: Friend) => void;
  onBlock?: (friend: Friend) => void;
  onRefreshList?: () => void;
}

export const FriendItem: React.FC<FriendItemProps> = ({
  friend,
  onPress,
  onRemove,
  onBlock,
  onRefreshList,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createFriendsStyles(colors), [colors]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportStep, setReportStep] = useState<1 | 2>(1);
  const [reportMode, setReportMode] = useState<'report' | 'block'>('report');

  const closeReportModal = () => {
    if (!reporting) {
      setReportModalVisible(false);
      setReportReason("");
      setReportStep(1);
      setReportMode('report');
    }
  };

  const handleConfirmReport = async () => {
    const reason = reportReason.trim();
    if (!reason) return;

    setReporting(true);
    try {
      await reportUser(friend.id, reason);
      
      if (reportMode === 'block') {
        await blockUser(Number(friend.id));
      }
      
      setReportModalVisible(false);
      setReportReason("");
      setReportStep(1);
      setReportMode('report');
      
      const alertMsg = reportMode === 'block'
        ? `Thank you. We have received your report and blocked ${friend.name}.`
        : `Thank you. We have received your report regarding ${friend.name} and will review it shortly.`;
      
      Alert.alert(
        reportMode === 'block' ? "Blocked & Reported" : "Report Submitted",
        alertMsg,
        [{ text: "OK", onPress: () => onRefreshList?.() }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Failed to complete request. Please try again later.",
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
        onRequestClose={closeReportModal}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={closeReportModal}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Report {friend.name}</Text>
            
            {reportStep === 1 ? (
              <>
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
                    onPress={closeReportModal}
                  >
                    <Text style={styles.standardActionText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, !reportReason.trim() && styles.primaryButtonDisabled]}
                    onPress={() => setReportStep(2)}
                    disabled={!reportReason.trim()}
                  >
                    <Text style={styles.primaryButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 14, color: colors.secondaryText, fontWeight: "600" }}>
                    Choose action to take:
                  </Text>
                  
                  <Pressable
                    onPress={() => setReportMode('report')}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: reportMode === 'report' ? colors.primary : colors.border,
                      backgroundColor: reportMode === 'report' ? colors.primaryLight : colors.surface,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: reportMode === 'report' ? colors.primary : colors.secondaryText,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {reportMode === 'report' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Report Only</Text>
                      <Text style={{ fontSize: 12, color: colors.secondaryText, marginTop: 2 }}>Only file a report with the admin.</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setReportMode('block')}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: reportMode === 'block' ? colors.primary : colors.border,
                      backgroundColor: reportMode === 'block' ? colors.primaryLight : colors.surface,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: reportMode === 'block' ? colors.primary : colors.secondaryText,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {reportMode === 'block' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Report & Block</Text>
                      <Text style={{ fontSize: 12, color: colors.secondaryText, marginTop: 2 }}>File a report and block/unfriend this user.</Text>
                    </View>
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setReportStep(1)}
                    disabled={reporting}
                  >
                    <Text style={styles.standardActionText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={closeReportModal}
                    disabled={reporting}
                  >
                    <Text style={styles.standardActionText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, reporting && styles.primaryButtonDisabled]}
                    onPress={handleConfirmReport}
                    disabled={reporting}
                  >
                    {reporting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default FriendItem;
