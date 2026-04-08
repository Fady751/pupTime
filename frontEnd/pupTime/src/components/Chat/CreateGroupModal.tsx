import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { AppColors } from '../../constants/colors';
import AvatarBadge, { type PresenceStatus } from './AvatarBadge';

export type GroupSelectableFriend = {
  id: number;
  name: string;
  avatarLabel: string;
  avatarUrl?: string;
  status: PresenceStatus;
};

type CreateGroupModalProps = {
  colors: AppColors;
  visible: boolean;
  selectedIds: number[];
  options: GroupSelectableFriend[];
  creating: boolean;
  onToggleUser: (userId: number) => void;
  onClose: () => void;
  onCreateGroup: () => void;
};

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  colors,
  visible,
  selectedIds,
  options,
  creating,
  onToggleUser,
  onClose,
  onCreateGroup,
}) => {
  const styles = createStyles(colors);
  const selected = new Set(selectedIds);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Group Chat</Text>
          <Text style={styles.subtitle}>Pick at least 2 friends to create a group.</Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {options.map(item => {
              const active = selected.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.row,
                    active && styles.rowSelected,
                    { opacity: pressed ? 0.84 : 1 },
                  ]}
                  onPress={() => onToggleUser(item.id)}
                >
                  <AvatarBadge
                    label={item.avatarLabel}
                    imageUrl={item.avatarUrl}
                    status={item.status}
                    seed={item.id}
                  />

                  <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>{item.status === 'online' ? 'Online' : 'Offline'}</Text>
                  </View>

                  <View style={[styles.checkmark, active && styles.checkmarkActive]}>
                    <Text style={[styles.checkmarkText, active && styles.checkmarkTextActive]}>
                      {active ? '✓' : '+'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.ghostButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.ghostButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onCreateGroup}
              disabled={selectedIds.length < 2 || creating}
              style={({ pressed }) => [
                styles.createButton,
                (selectedIds.length < 2 || creating) && styles.createButtonDisabled,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.createButtonText}>{creating ? 'Creating...' : 'Create Group'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.42)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    card: {
      width: '100%',
      maxHeight: '80%',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(37, 99, 235, 0.26)',
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.secondaryText,
      fontSize: 13,
      marginTop: 4,
      marginBottom: 10,
    },
    list: {
      maxHeight: 370,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(148, 163, 184, 0.28)',
      backgroundColor: colors.background,
      paddingHorizontal: 10,
      paddingVertical: 9,
      marginBottom: 8,
    },
    rowSelected: {
      borderColor: 'rgba(37, 99, 235, 0.46)',
      backgroundColor: 'rgba(37, 99, 235, 0.08)',
    },
    info: {
      flex: 1,
      marginLeft: 10,
    },
    name: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    meta: {
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 2,
    },
    checkmark: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkmarkActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    checkmarkText: {
      color: colors.secondaryText,
      fontWeight: '800',
      fontSize: 15,
    },
    checkmarkTextActive: {
      color: colors.primaryText,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      gap: 10,
    },
    ghostButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    ghostButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    createButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.22)',
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    createButtonDisabled: {
      opacity: 0.55,
    },
    createButtonText: {
      color: colors.primaryText,
      fontSize: 14,
      fontWeight: '800',
    },
  });

export default CreateGroupModal;
