import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';

import useTheme from '../../../Hooks/useTheme';
import createChatRoomsStyles from './ChatRooms.styles';
import type { RootState } from '../../../redux/store';
import type { AppStackParamList } from '../../../navigation/AppNavigator';
import type { ChatRoom } from '../../../types/chat';
import { listChatRooms, createOrFetchDirectRoom, deleteChatRoom } from '../../../services/chatService';
import { searchUsers, SearchUser } from '../../../services/friendshipService';

const ChatRoomsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { colors } = useTheme();
  const styles = useMemo(() => createChatRoomsStyles(colors), [colors]);
  const currentUserId = useSelector((state: RootState) => state.user.data?.id);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ──── Search modal state ──── */
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingChat, setStartingChat] = useState<number | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ──── Load rooms ──── */
  const loadRooms = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await listChatRooms({});
      // Sort by latest_message.created_at desc, rooms with no messages last
      data.sort((a, b) => {
        const aTime = a.latest_message?.created_at ?? a.created_at;
        const bTime = b.latest_message?.created_at ?? b.created_at;
        return dayjs(bTime).diff(dayjs(aTime));
      });
      setRooms(data);
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRooms(true);
    }, [loadRooms]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRooms(false);
    setRefreshing(false);
  }, [loadRooms]);

  /* ──── Helpers ──── */
  const getOtherUser = (room: ChatRoom) => {
    if (!currentUserId) return room.users[0];
    return room.users.find(u => u.id !== currentUserId) ?? room.users[0];
  };

  const formatTime = (dateStr: string) => {
    const d = dayjs(dateStr);
    const now = dayjs();
    if (d.isSame(now, 'day')) return d.format('h:mm A');
    if (d.isSame(now.subtract(1, 'day'), 'day')) return 'Yesterday';
    if (d.isSame(now, 'year')) return d.format('MMM D');
    return d.format('MMM D, YYYY');
  };

  /* ──── Search users for new chat ──── */
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (text.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const results = await searchUsers(text.trim());
        // Filter out current user
        setSearchResults(results.filter(u => u.id !== currentUserId));
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleStartChat = async (user: SearchUser) => {
    setStartingChat(user.id);
    try {
      const room = await createOrFetchDirectRoom(user.id);
      setSearchVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      navigation.navigate('ChatRoom', {
        roomId: room.id,
        roomName: user.username,
      });
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Could not start chat');
    } finally {
      setStartingChat(null);
    }
  };

  const handleOpenRoom = (room: ChatRoom) => {
    const other = getOtherUser(room);
    navigation.navigate('ChatRoom', {
      roomId: room.id,
      roomName: other?.username ?? 'Chat',
    });
  };

  const handleLongPressRoom = (room: ChatRoom) => {
    navigation.navigate('ChatRoomDetails', {
      roomId: room.id,
    });
  };

  /* ──── Render room item ──── */
  const renderRoom = ({ item }: { item: ChatRoom }) => {
    const other = getOtherUser(item);
    const initials = (other?.username ?? '?').slice(0, 2).toUpperCase();
    const lastMsg = item.latest_message;
    const timeStr = lastMsg ? formatTime(lastMsg.created_at) : formatTime(item.created_at);

    let preview = 'No messages yet';
    if (lastMsg) {
      const isMine = lastMsg.sender.id === currentUserId;
      preview = isMine ? `You: ${lastMsg.content}` : lastMsg.content;
    }

    return (
      <Pressable
        style={({ pressed }) => [styles.roomCard, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => handleOpenRoom(item)}
        onLongPress={() => handleLongPressRoom(item)}
      >
        <View style={styles.roomAvatar}>
          <Text style={styles.roomAvatarText}>{initials}</Text>
        </View>
        <View style={styles.roomInfo}>
          <Text style={styles.roomName} numberOfLines={1}>
            {other?.username ?? 'Unknown'}
          </Text>
          <Text style={styles.roomLastMsg} numberOfLines={1}>
            {preview}
          </Text>
        </View>
        <View style={styles.roomMeta}>
          <Text style={styles.roomTime}>{timeStr}</Text>
        </View>
      </Pressable>
    );
  };

  /* ──── Render search result ──── */
  const renderSearchResult = ({ item }: { item: SearchUser }) => {
    const initials = item.username.slice(0, 2).toUpperCase();
    const isBusy = startingChat === item.id;

    return (
      <View style={styles.searchResultRow}>
        <View style={styles.searchAvatar}>
          <Text style={styles.searchAvatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.searchName}>{item.username}</Text>
          {item.email ? <Text style={styles.searchEmail}>{item.email}</Text> : null}
        </View>
        <Pressable
          style={({ pressed }) => [styles.searchStartButton, { opacity: pressed || isBusy ? 0.7 : 1 }]}
          onPress={() => handleStartChat(item)}
          disabled={isBusy}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Text style={styles.searchStartText}>Chat</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />

        {/* ──── Header ──── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Messages</Text>
            <Text style={styles.title}>Chats</Text>
            <Text style={styles.subtitle}>Your conversations</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.newChatButton, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setSearchVisible(true)}
            >
              <Text style={styles.newChatIcon}>✎</Text>
            </Pressable>
          </View>
        </View>

        {/* ──── Rooms list ──── */}
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a new chat by searching for a user.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.emptyButton, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setSearchVisible(true)}
            >
              <Text style={styles.emptyButtonText}>New Chat</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={rooms}
            renderItem={renderRoom}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        )}

        {/* ──── Search / New chat modal ──── */}
        <Modal
          visible={searchVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSearchVisible(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setSearchVisible(false)}>
              <Pressable style={styles.modalSheet} onPress={() => {}}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>New Chat</Text>

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by username..."
                  placeholderTextColor={colors.secondaryText}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  autoFocus
                  autoCapitalize="none"
                />

                {searching ? (
                  <View style={styles.searchingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={item => item.id.toString()}
                    keyboardShouldPersistTaps="handled"
                  />
                ) : searchQuery.trim().length >= 2 && !searching ? (
                  <View style={styles.searchEmpty}>
                    <Text style={styles.searchEmptyText}>No users found</Text>
                  </View>
                ) : (
                  <View style={styles.searchEmpty}>
                    <Text style={styles.searchEmptyText}>
                      Type a username to search
                    </Text>
                  </View>
                )}
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default ChatRoomsScreen;
