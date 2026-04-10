import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

import useTheme from '../../../Hooks/useTheme';
import { useChat } from '../../../Hooks/useChat';
import createChatRoomStyles from './ChatRoom.styles';
import type { RootState } from '../../../redux/store';
import type { AppStackParamList } from '../../../navigation/AppNavigator';
import type { ChatMessage } from '../../../types/chat';

type ChatRoomRouteProp = RouteProp<AppStackParamList, 'ChatRoom'>;

const ChatRoomScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ChatRoomRouteProp>();
  const { roomId, roomName } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createChatRoomStyles(colors), [colors]);
  const currentUserId = useSelector((state: RootState) => state.user.data?.id);

  const {
    messages,
    isConnected,
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMoreMessages,
  } = useChat(roomId);

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text);
    setInputText('');
    // Scroll to bottom after sending
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, sendMessage]);

  /* ──── Date separator logic ──── */
  const formatDateSeparator = (dateStr: string) => {
    const d = dayjs(dateStr);
    const now = dayjs();
    if (d.isSame(now, 'day')) return 'Today';
    if (d.isSame(now.subtract(1, 'day'), 'day')) return 'Yesterday';
    if (d.isSame(now, 'year')) return d.format('ddd, MMM D');
    return d.format('MMM D, YYYY');
  };

  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    const curr = dayjs(messages[index].created_at);
    const prev = dayjs(messages[index - 1].created_at);
    return !curr.isSame(prev, 'day');
  };

  /* ──── Render message ──── */
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.sender.id === currentUserId;
    const showDate = shouldShowDateSeparator(index);
    const timeStr = dayjs(item.created_at).format('h:mm A');

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatDateSeparator(item.created_at)}
            </Text>
          </View>
        )}
        <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
          {!isMine && (
            <Text style={styles.senderName}>{item.sender.username}</Text>
          )}
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
              {item.content}
            </Text>
            <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
              {timeStr}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  /* ──── Header ──── */
  const initials = (roomName ?? 'C').slice(0, 2).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ──── Header ──── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{initials}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {roomName ?? 'Chat'}
          </Text>
          <Text
            style={[
              styles.headerStatus,
              isConnected ? styles.headerStatusOnline : styles.headerStatusOffline,
            ]}
          >
            {isConnected ? 'Online' : 'Connecting...'}
          </Text>
        </View>
      </View>

      {/* ──── Messages ──── */}
      {messages.length === 0 && !isLoadingMore ? (
        <View style={styles.emptyChatContainer}>
          <Text style={styles.emptyChatIcon}>👋</Text>
          <Text style={styles.emptyChatTitle}>Say hello!</Text>
          <Text style={styles.emptyChatSubtitle}>
            Send a message to start the conversation with {roomName ?? 'your friend'}.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListHeaderComponent={
            hasMore ? (
              <View style={styles.loadMoreContainer}>
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.loadMoreButton, { opacity: pressed ? 0.7 : 1 }]}
                    onPress={loadMoreMessages}
                  >
                    <Text style={styles.loadMoreText}>Load older messages</Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
        />
      )}

      {/* ──── Input bar ──── */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={colors.secondaryText}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatRoomScreen;
