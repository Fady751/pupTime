import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import useTheme from '../../Hooks/useTheme';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { Friend } from '../../types/friend';
import type { ChatMessage, ChatRoom } from '../../types/chat';
import {
  addUserToRoom,
  buildRoomSocketUrl,
  createOrFetchDirectRoom,
  findDirectRoomWithUser,
  getRoomMessages,
  listChatRooms,
} from '../../services/chatService';
import {
  extractApiErrorMessage,
  getFriends,
} from '../../services/friendshipService';
import ChatSidebar, {
  type SidebarConversation,
  type SidebarFriend,
} from '../../components/Chat/ChatSidebar';
import AvatarBadge from '../../components/Chat/AvatarBadge';
import MessageBubble, {
  type MessageViewModel,
} from '../../components/Chat/MessageBubble';
import MessageInput from '../../components/Chat/MessageInput';
import CreateGroupModal from '../../components/Chat/CreateGroupModal';
import createFriendsChatStyles from './FriendsChat.styles';

type FriendsChatScreenProps = NativeStackScreenProps<AppStackParamList, 'FriendsChat'>;
type SocketState = 'connected' | 'connecting' | 'disconnected';

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const resolveAvatarUrl = (avatar?: string): string | undefined => {
  const trimmed = avatar?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return undefined;
};

const getRoomDisplayName = (room: ChatRoom, currentUserId?: number): string => {
  const otherUsers = room.users.filter(user => user.id !== currentUserId);

  if (room.users.length > 2) {
    const visible = otherUsers.slice(0, 2).map(user => user.username).join(', ');
    const remainingCount = Math.max(0, otherUsers.length - 2);
    return remainingCount ? `${visible} +${remainingCount}` : visible;
  }

  if (otherUsers.length) {
    return otherUsers[0].username;
  }

  return 'Direct Chat';
};

const getRoomMetaLabel = (room: ChatRoom, currentUserId?: number): string => {
  if (room.users.length > 2) {
    const participants = room.users.filter(user => user.id !== currentUserId).length;
    return `${participants} participants`;
  }

  return '1-to-1 conversation';
};

const isOnlineFromLastActivity = (activityAt?: string): boolean => {
  if (!activityAt) {
    return false;
  }

  const timestamp = new Date(activityAt).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp < ONLINE_WINDOW_MS;
};

const sortRoomsByRecentActivity = (rooms: ChatRoom[]): ChatRoom[] => {
  return [...rooms].sort((a, b) => {
    const aTimestamp =
      new Date(a.latest_message?.created_at ?? a.created_at).getTime() || 0;
    const bTimestamp =
      new Date(b.latest_message?.created_at ?? b.created_at).getTime() || 0;

    return bTimestamp - aTimestamp;
  });
};

const FriendsChatScreen: React.FC<FriendsChatScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 940;
  const isScreenFocused = useIsFocused();
  const styles = useMemo(() => createFriendsChatStyles(colors, isWideScreen), [colors, isWideScreen]);

  const currentUser = useSelector((state: RootState) => state.user.data);
  const currentUserId = currentUser?.id;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<number, ChatMessage[]>>({});
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshingSidebar, setRefreshingSidebar] = useState(false);
  const [socketState, setSocketState] = useState<SocketState>('disconnected');
  const [screenError, setScreenError] = useState<string | null>(null);

  const [showChatPaneOnMobile, setShowChatPaneOnMobile] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupSelection, setGroupSelection] = useState<number[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [unreadByRoom, setUnreadByRoom] = useState<Record<number, number>>({});

  const messageListRef = useRef<FlatList<MessageViewModel>>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const latestMessageByRoomRef = useRef<Record<number, number>>({});
  const hasLoadedRoomsRef = useRef(false);

  const closeSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.close();
      socketRef.current = null;
    }
    setSocketState('disconnected');
  }, []);

  const loadRoomMessages = useCallback(
    async (roomId: number, withSpinner = true) => {
      if (!roomId) {
        return;
      }

      try {
        if (withSpinner) {
          setLoadingMessages(true);
        }

        const list = await getRoomMessages(roomId);
        setMessagesByRoom(prev => ({
          ...prev,
          [roomId]: list,
        }));

        setUnreadByRoom(prev => ({
          ...prev,
          [roomId]: 0,
        }));
      } catch (error) {
        setScreenError(extractApiErrorMessage(error, 'Unable to load room messages.'));
      } finally {
        if (withSpinner) {
          setLoadingMessages(false);
        }
      }
    },
    [],
  );

  const refreshRooms = useCallback(
    async (markRefreshing = false): Promise<ChatRoom[]> => {
      if (markRefreshing) {
        setRefreshingSidebar(true);
      }

      try {
        const fetchedRooms = sortRoomsByRecentActivity(await listChatRooms());
        const roomIds = new Set(fetchedRooms.map(room => room.id));
        const previousLatest = latestMessageByRoomRef.current;

        const nextLatest: Record<number, number> = {};
        fetchedRooms.forEach(room => {
          nextLatest[room.id] = room.latest_message?.id ?? 0;
        });

        setUnreadByRoom(prev => {
          const next = { ...prev };

          Object.keys(next).forEach(rawRoomId => {
            const roomId = Number(rawRoomId);
            if (!roomIds.has(roomId)) {
              delete next[roomId];
            }
          });

          if (hasLoadedRoomsRef.current) {
            fetchedRooms.forEach(room => {
              const latestId = nextLatest[room.id];
              const previousId = previousLatest[room.id] ?? 0;

              if (latestId > previousId && room.id !== activeRoomId) {
                next[room.id] = (next[room.id] ?? 0) + 1;
              }
            });
          }

          return next;
        });

        latestMessageByRoomRef.current = nextLatest;
        hasLoadedRoomsRef.current = true;

        setRooms(fetchedRooms);
        setActiveRoomId(prev => {
          if (!fetchedRooms.length) {
            return null;
          }

          if (prev && roomIds.has(prev)) {
            return prev;
          }

          return fetchedRooms[0].id;
        });

        return fetchedRooms;
      } catch (error) {
        setScreenError(extractApiErrorMessage(error, 'Unable to refresh chats.'));
        return [];
      } finally {
        if (markRefreshing) {
          setRefreshingSidebar(false);
        }
      }
    },
    [activeRoomId],
  );

  const loadInitialData = useCallback(async () => {
    if (!currentUserId) {
      setLoadingInitial(false);
      setScreenError('Please sign in to open your chats.');
      return;
    }

    setLoadingInitial(true);
    setScreenError(null);

    try {
      const [friendsList] = await Promise.all([
        getFriends(currentUserId),
        refreshRooms(false),
      ]);
      setFriends(friendsList);
    } catch (error) {
      setScreenError(extractApiErrorMessage(error, 'Unable to load chat data.'));
    } finally {
      setLoadingInitial(false);
    }
  }, [currentUserId, refreshRooms]);

  const openOrCreateDirectChat = useCallback(
    async (friendUserId: number) => {
      if (!currentUserId) {
        return;
      }

      try {
        setScreenError(null);

        let targetRoom = findDirectRoomWithUser(rooms, currentUserId, friendUserId);

        if (!targetRoom) {
          targetRoom = await createOrFetchDirectRoom(friendUserId);
        }

        setRooms(prev => sortRoomsByRecentActivity([
          targetRoom as ChatRoom,
          ...prev.filter(room => room.id !== targetRoom?.id),
        ]));

        setActiveRoomId(targetRoom.id);
        setUnreadByRoom(prev => ({
          ...prev,
          [targetRoom.id]: 0,
        }));

        if (!isWideScreen) {
          setShowChatPaneOnMobile(true);
        }

        await loadRoomMessages(targetRoom.id, true);
        await refreshRooms(false);
      } catch (error) {
        Alert.alert('Unable to open chat', extractApiErrorMessage(error));
      }
    },
    [currentUserId, isWideScreen, loadRoomMessages, refreshRooms, rooms],
  );

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData]),
  );

  useEffect(() => {
    const roomIdFromRoute = route.params?.friendUserId;
    if (!roomIdFromRoute || !currentUserId) {
      return;
    }

    openOrCreateDirectChat(roomIdFromRoute).finally(() => {
      navigation.setParams({
        friendUserId: undefined,
        friendName: undefined,
      });
    });
  }, [currentUserId, navigation, openOrCreateDirectChat, route.params?.friendUserId]);

  useEffect(() => {
    if (!isScreenFocused || !activeRoomId) {
      closeSocket();
      return;
    }

    let cancelled = false;

    const connect = async () => {
      closeSocket();
      setSocketState('connecting');

      try {
        const socketUrl = await buildRoomSocketUrl(activeRoomId);
        if (cancelled) {
          return;
        }

        const socket = new WebSocket(socketUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!cancelled) {
            setSocketState('connected');
          }
        };

        socket.onmessage = () => {
          if (cancelled) {
            return;
          }

          refreshRooms(false);
          loadRoomMessages(activeRoomId, false);
        };

        socket.onerror = () => {
          if (!cancelled) {
            setSocketState('disconnected');
          }
        };

        socket.onclose = () => {
          if (!cancelled) {
            setSocketState('disconnected');
          }
        };
      } catch {
        if (!cancelled) {
          setSocketState('disconnected');
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      closeSocket();
    };
  }, [activeRoomId, closeSocket, isScreenFocused, loadRoomMessages, refreshRooms]);

  useEffect(() => {
    if (!activeRoomId) {
      return;
    }

    loadRoomMessages(activeRoomId, true);

    setUnreadByRoom(prev => ({
      ...prev,
      [activeRoomId]: 0,
    }));
  }, [activeRoomId, loadRoomMessages]);

  useEffect(() => {
    if (!isScreenFocused) {
      return;
    }

    const pollingTimer = setInterval(() => {
      refreshRooms(false);
      if (activeRoomId) {
        loadRoomMessages(activeRoomId, false);
      }
    }, 7000);

    return () => {
      clearInterval(pollingTimer);
    };
  }, [activeRoomId, isScreenFocused, loadRoomMessages, refreshRooms]);

  const activeMessages = useMemo(() => {
    if (!activeRoomId) {
      return [];
    }

    return messagesByRoom[activeRoomId] ?? [];
  }, [activeRoomId, messagesByRoom]);

  useEffect(() => {
    if (!activeMessages.length) {
      return;
    }

    const timer = setTimeout(() => {
      messageListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [activeMessages.length, activeRoomId]);

  const activeRoom = useMemo(
    () => rooms.find(room => room.id === activeRoomId) ?? null,
    [activeRoomId, rooms],
  );

  const directRoomByFriendId = useMemo(() => {
    const map = new Map<number, ChatRoom>();

    if (!currentUserId) {
      return map;
    }

    rooms.forEach(room => {
      if (room.users.length !== 2) {
        return;
      }

      const friendUser = room.users.find(user => user.id !== currentUserId);
      if (friendUser) {
        map.set(friendUser.id, room);
      }
    });

    return map;
  }, [currentUserId, rooms]);

  const filteredFriends = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return friends
      .filter(friend => {
        if (!normalized) {
          return true;
        }
        return friend.name.toLowerCase().includes(normalized);
      })
      .map<SidebarFriend>(friend => {
        const friendId = Number(friend.id);
        const directRoom = directRoomByFriendId.get(friendId);
        const status: SidebarFriend['status'] =
          directRoom &&
          ((directRoom.id === activeRoomId && socketState === 'connected') ||
            isOnlineFromLastActivity(directRoom.latest_message?.created_at))
            ? 'online'
            : 'offline';

        return {
          id: friendId,
          name: friend.name,
          status,
          avatarLabel: friend.name,
          avatarUrl: resolveAvatarUrl(friend.avatar),
        };
      });
  }, [activeRoomId, directRoomByFriendId, friends, searchQuery, socketState]);

  const conversationItems = useMemo<SidebarConversation[]>(() => {
    const normalized = searchQuery.trim().toLowerCase();

    return rooms
      .map(room => {
        const title = getRoomDisplayName(room, currentUserId);
        const latestAt = room.latest_message?.created_at;
        const isCurrentlyOnline =
          (room.id === activeRoomId && socketState === 'connected') ||
          isOnlineFromLastActivity(latestAt);
        const status: SidebarConversation['status'] = isCurrentlyOnline
          ? 'online'
          : 'offline';

        return {
          roomId: room.id,
          title,
          avatarLabel: title,
          isGroup: room.users.length > 2,
          status,
          preview: room.latest_message?.content ?? '',
          updatedAt: latestAt,
          unreadCount: unreadByRoom[room.id] ?? 0,
        };
      })
      .filter(item => {
        if (!normalized) {
          return true;
        }
        return item.title.toLowerCase().includes(normalized) || item.preview.toLowerCase().includes(normalized);
      });
  }, [activeRoomId, currentUserId, rooms, searchQuery, socketState, unreadByRoom]);

  const totalUnread = useMemo(
    () => Object.values(unreadByRoom).reduce((sum, count) => sum + count, 0),
    [unreadByRoom],
  );

  const groupOptions = useMemo(
    () =>
      friends.map(friend => ({
        id: Number(friend.id),
        name: friend.name,
        avatarLabel: friend.name,
        avatarUrl: resolveAvatarUrl(friend.avatar),
        status: 'offline' as const,
      })),
    [friends],
  );

  const messageItems = useMemo<MessageViewModel[]>(() => {
    return activeMessages.map(message => ({
      id: message.id,
      senderId: message.sender.id,
      senderName: message.sender.username,
      content: message.content,
      createdAt: message.created_at,
      isMine: message.sender.id === currentUserId,
    }));
  }, [activeMessages, currentUserId]);

  const handleSelectRoom = useCallback(
    (roomId: number) => {
      setActiveRoomId(roomId);
      setUnreadByRoom(prev => ({
        ...prev,
        [roomId]: 0,
      }));

      if (!isWideScreen) {
        setShowChatPaneOnMobile(true);
      }
    },
    [isWideScreen],
  );

  const handleSendMessage = useCallback(() => {
    const content = messageDraft.trim();
    if (!content || !activeRoomId) {
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      Alert.alert('Chat not ready', 'Connection is still being established. Please try again.');
      return;
    }

    socketRef.current.send(JSON.stringify({ message: content }));
    setMessageDraft('');
  }, [activeRoomId, messageDraft]);

  const toggleGroupSelection = useCallback((userId: number) => {
    setGroupSelection(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (groupSelection.length < 2) {
      Alert.alert('Select more friends', 'Choose at least two friends for a group chat.');
      return;
    }

    try {
      setCreatingGroup(true);

      const [firstUserId, ...otherUserIds] = groupSelection;
      const baseRoom = await createOrFetchDirectRoom(firstUserId);

      for (const userId of otherUserIds) {
        await addUserToRoom(baseRoom.id, userId);
      }

      await refreshRooms(true);
      setActiveRoomId(baseRoom.id);
      setShowCreateGroupModal(false);
      setGroupSelection([]);

      if (!isWideScreen) {
        setShowChatPaneOnMobile(true);
      }

      await loadRoomMessages(baseRoom.id, true);
    } catch (error) {
      Alert.alert('Unable to create group', extractApiErrorMessage(error));
    } finally {
      setCreatingGroup(false);
    }
  }, [groupSelection, isWideScreen, loadRoomMessages, refreshRooms]);

  const handleBackPress = useCallback(() => {
    if (!isWideScreen && showChatPaneOnMobile) {
      setShowChatPaneOnMobile(false);
      return;
    }

    navigation.goBack();
  }, [isWideScreen, navigation, showChatPaneOnMobile]);

  const showSidebar = isWideScreen || !showChatPaneOnMobile;
  const showChatPane = isWideScreen || showChatPaneOnMobile;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.84 : 1 }]}
              onPress={handleBackPress}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>

            <View style={styles.headerTextWrap}>
              <Text style={styles.kicker}>Realtime Conversations</Text>
              <Text style={styles.title}>Friends Chat</Text>
              <Text style={styles.subtitle}>Modern messaging with direct and group chats</Text>
            </View>
          </View>

          {!!screenError && (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{screenError}</Text>
            </View>
          )}
        </View>

        <View style={styles.layoutRow}>
          {showSidebar && (
            <View style={styles.sidebarPane}>
              <ChatSidebar
                colors={colors}
                conversations={conversationItems}
                friends={filteredFriends}
                activeRoomId={activeRoomId}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onSelectConversation={handleSelectRoom}
                onStartChatWithFriend={openOrCreateDirectChat}
                onCreateGroupPress={() => setShowCreateGroupModal(true)}
                onRefreshPress={() => refreshRooms(true)}
                totalUnread={totalUnread}
                loading={loadingInitial}
                refreshing={refreshingSidebar}
              />
            </View>
          )}

          {showChatPane && (
            <KeyboardAvoidingView
              style={styles.chatPane}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 86 : 0}
            >
              {activeRoom ? (
                <>
                  <View style={styles.chatHeader}>
                    <View style={styles.chatHeaderMain}>
                      <AvatarBadge
                        label={getRoomDisplayName(activeRoom, currentUserId)}
                        status={
                          (activeRoom.id === activeRoomId && socketState === 'connected') ||
                          isOnlineFromLastActivity(activeRoom.latest_message?.created_at)
                            ? 'online'
                            : 'offline'
                        }
                        seed={activeRoom.id}
                      />

                      <View style={styles.chatTitleWrap}>
                        <Text style={styles.chatTitle} numberOfLines={1}>
                          {getRoomDisplayName(activeRoom, currentUserId)}
                        </Text>
                        <Text style={styles.chatMeta} numberOfLines={1}>
                          {getRoomMetaLabel(activeRoom, currentUserId)}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [styles.chatHeaderAction, { opacity: pressed ? 0.85 : 1 }]}
                      onPress={() => setShowCreateGroupModal(true)}
                    >
                      <Text style={styles.chatHeaderActionText}>Group +</Text>
                    </Pressable>
                  </View>

                  {loadingMessages ? (
                    <View style={styles.loadingState}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : (
                    <FlatList
                      ref={messageListRef}
                      style={styles.messagesList}
                      contentContainerStyle={styles.messagesContent}
                      data={messageItems}
                      keyExtractor={item => item.id.toString()}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <MessageBubble
                          colors={colors}
                          message={item}
                          showSender={activeRoom.users.length > 2}
                        />
                      )}
                      ListEmptyComponent={
                        <View style={styles.emptyChatState}>
                          <Text style={styles.emptyChatTitle}>No messages yet</Text>
                          <Text style={styles.emptyChatSubtitle}>
                            Start the conversation and your messages will appear here in real time.
                          </Text>
                        </View>
                      }
                    />
                  )}

                  <MessageInput
                    colors={colors}
                    value={messageDraft}
                    onChangeText={setMessageDraft}
                    onSend={handleSendMessage}
                    disabled={!activeRoom}
                    socketState={socketState}
                  />
                </>
              ) : loadingInitial ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <View style={styles.emptyChatState}>
                  <Text style={styles.emptyChatTitle}>Choose a friend to start chatting</Text>
                  <Text style={styles.emptyChatSubtitle}>
                    Open any friend from the sidebar to create or resume a conversation.
                  </Text>
                </View>
              )}
            </KeyboardAvoidingView>
          )}
        </View>
      </View>

      <CreateGroupModal
        colors={colors}
        visible={showCreateGroupModal}
        selectedIds={groupSelection}
        options={groupOptions}
        creating={creatingGroup}
        onToggleUser={toggleGroupSelection}
        onClose={() => {
          setShowCreateGroupModal(false);
          setGroupSelection([]);
        }}
        onCreateGroup={handleCreateGroup}
      />
    </SafeAreaView>
  );
};

export default FriendsChatScreen;
