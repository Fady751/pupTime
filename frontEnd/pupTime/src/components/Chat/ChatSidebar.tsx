import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { AppColors } from '../../constants/colors';
import AvatarBadge, { type PresenceStatus } from './AvatarBadge';

export type SidebarConversation = {
  roomId: number;
  title: string;
  preview: string;
  updatedAt?: string;
  unreadCount: number;
  isGroup: boolean;
  status: PresenceStatus;
  avatarLabel: string;
  avatarUrl?: string;
};

export type SidebarFriend = {
  id: number;
  name: string;
  status: PresenceStatus;
  avatarLabel: string;
  avatarUrl?: string;
};

type ChatSidebarProps = {
  colors: AppColors;
  conversations: SidebarConversation[];
  friends: SidebarFriend[];
  activeRoomId: number | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSelectConversation: (roomId: number) => void;
  onStartChatWithFriend: (friendId: number) => void;
  onCreateGroupPress: () => void;
  onRefreshPress: () => void;
  totalUnread: number;
  loading: boolean;
  refreshing: boolean;
};

const formatShortTime = (value?: string): string => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const now = new Date();
  const sameDay = parsed.toDateString() === now.toDateString();

  if (sameDay) {
    return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  colors,
  conversations,
  friends,
  activeRoomId,
  searchQuery,
  onSearchQueryChange,
  onSelectConversation,
  onStartChatWithFriend,
  onCreateGroupPress,
  onRefreshPress,
  totalUnread,
  loading,
  refreshing,
}) => {
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.kicker}>Social</Text>
          <Text style={styles.title}>Friends Chat</Text>
        </View>

        <View style={styles.unreadPill}>
          <Text style={styles.unreadPillText}>{totalUnread}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.85 : 1 }]}
          onPress={onCreateGroupPress}
        >
          <Text style={styles.actionButtonText}>New Group</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryActionButton, { opacity: pressed ? 0.85 : 1 }]}
          onPress={onRefreshPress}
        >
          <Text style={styles.secondaryActionText}>{refreshing ? '...' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <TextInput
        value={searchQuery}
        onChangeText={onSearchQueryChange}
        style={styles.searchInput}
        placeholder="Search chats or friends"
        placeholderTextColor={colors.secondaryText}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Recent Chats</Text>

          {conversations.length ? (
            conversations.map(item => {
              const selected = item.roomId === activeRoomId;
              return (
                <Pressable
                  key={item.roomId}
                  onPress={() => onSelectConversation(item.roomId)}
                  style={({ pressed }) => [
                    styles.conversationCard,
                    selected && styles.conversationCardSelected,
                    { opacity: pressed ? 0.84 : 1 },
                  ]}
                >
                  <AvatarBadge
                    label={item.avatarLabel}
                    imageUrl={item.avatarUrl}
                    status={item.status}
                    seed={item.roomId}
                  />

                  <View style={styles.conversationBody}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.conversationTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.timeText}>{formatShortTime(item.updatedAt)}</Text>
                    </View>

                    <View style={styles.rowBetween}>
                      <Text style={styles.previewText} numberOfLines={1}>
                        {item.preview || (item.isGroup ? 'Group chat' : 'Say hi 👋')}
                      </Text>
                      {!!item.unreadCount && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No conversations yet.</Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, styles.friendsSection]}>Friends</Text>

          {friends.length ? (
            friends.map(friend => (
              <Pressable
                key={friend.id}
                style={({ pressed }) => [styles.friendRow, { opacity: pressed ? 0.82 : 1 }]}
                onPress={() => onStartChatWithFriend(friend.id)}
              >
                <AvatarBadge
                  label={friend.avatarLabel}
                  imageUrl={friend.avatarUrl}
                  status={friend.status}
                  seed={friend.id}
                />
                <View style={styles.friendBody}>
                  <Text style={styles.friendName} numberOfLines={1}>
                    {friend.name}
                  </Text>
                  <Text style={styles.friendMeta}>{friend.status === 'online' ? 'Online' : 'Offline'}</Text>
                </View>
                <View style={styles.chatPill}>
                  <Text style={styles.chatPillText}>Chat</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Add friends to start chatting.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: 'rgba(37, 99, 235, 0.24)',
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 4,
    },
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(37, 99, 235, 0.25)',
      backgroundColor: 'rgba(37, 99, 235, 0.08)',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    kicker: {
      color: '#0EA5E9',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    title: {
      color: colors.text,
      marginTop: 2,
      fontSize: 20,
      fontWeight: '900',
    },
    unreadPill: {
      minWidth: 38,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadPillText: {
      color: colors.primaryText,
      fontSize: 12,
      fontWeight: '800',
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      gap: 8,
    },
    actionButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.22)',
    },
    actionButtonText: {
      color: colors.primaryText,
      fontSize: 12,
      fontWeight: '800',
    },
    secondaryActionButton: {
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    secondaryActionText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    searchInput: {
      marginTop: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '500',
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollArea: {
      marginTop: 12,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    sectionTitle: {
      color: colors.secondaryText,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    friendsSection: {
      marginTop: 12,
    },
    conversationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(148, 163, 184, 0.28)',
      backgroundColor: colors.background,
      marginBottom: 8,
    },
    conversationCardSelected: {
      borderColor: 'rgba(37, 99, 235, 0.48)',
      backgroundColor: 'rgba(37, 99, 235, 0.08)',
    },
    conversationBody: {
      flex: 1,
      marginLeft: 10,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    conversationTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    timeText: {
      color: colors.secondaryText,
      fontSize: 11,
      fontWeight: '600',
    },
    previewText: {
      flex: 1,
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 4,
    },
    badge: {
      marginTop: 4,
      minWidth: 22,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0EA5E9',
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    friendRow: {
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
    friendBody: {
      flex: 1,
      marginLeft: 10,
    },
    friendName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    friendMeta: {
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 2,
      fontWeight: '500',
    },
    chatPill: {
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: 'rgba(37, 99, 235, 0.35)',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    chatPillText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    emptyCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(148, 163, 184, 0.28)',
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 14,
      marginBottom: 8,
    },
    emptyText: {
      color: colors.secondaryText,
      fontSize: 13,
      textAlign: 'center',
    },
  });

export default ChatSidebar;
