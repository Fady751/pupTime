import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

import useTheme from '../../../Hooks/useTheme';
import createChatRoomDetailsStyles from './ChatRoomDetails.styles';
import { AppStackParamList } from '../../../navigation/AppNavigator';
import { getChatRoomById, deleteChatRoom } from '../../../services/chatService';
import { ChatRoom } from '../../../types/chat';
import { extractApiErrorMessage } from '../../../services/friendshipService';
import { RootState } from '../../../redux/store';

type ChatRoomDetailsRouteProp = RouteProp<AppStackParamList, 'ChatRoomDetails'>;

const ChatRoomDetailsScreen: React.FC = () => {
  const route = useRoute<ChatRoomDetailsRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { colors } = useTheme();
  const styles = useMemo(() => createChatRoomDetailsStyles(colors), [colors]);

  const { roomId } = route.params;
  const currentUserId = useSelector((state: RootState) => state.user.data?.id);

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRoom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedRoom = await getChatRoomById(roomId);
      setRoom(fetchedRoom);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to load details.'));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  const getOtherUser = (r: ChatRoom) => {
    if (!currentUserId) return r.users[0];
    return r.users.find((u) => u.id !== currentUserId) ?? r.users[0];
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteChatRoom(roomId);
              // Navigate back to ChatRooms list.
              navigation.navigate('ChatRooms');
            } catch (err) {
              setDeleting(false);
              Alert.alert('Error', extractApiErrorMessage(err, 'Could not delete chat.'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.glowOrbTop} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !room) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || 'Room not found.'}</Text>
            <Pressable style={styles.retryButton} onPress={loadRoom}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const otherUser = getOtherUser(room);
  const initials = (otherUser?.username || '?').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />

        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Chat Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Main Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.roomAvatar}>
              <Text style={styles.roomAvatarText}>{initials}</Text>
            </View>
            <Text style={styles.roomName}>{otherUser?.username || 'Unknown User'}</Text>
            <Text style={styles.roomMeta}>
              Created {dayjs(room.created_at).format('MMM D, YYYY')}
            </Text>
          </View>

          {/* Members List */}
          <Text style={styles.sectionTitle}>Members ({room.users.length})</Text>
          <View style={styles.usersList}>
            {room.users.map((u, index) => {
              const uInitials = u.username.slice(0, 2).toUpperCase();
              const isMe = u.id === currentUserId;
              const isLast = index === room.users.length - 1;

              return (
                <View key={u.id} style={[styles.userRow, isLast && { borderBottomWidth: 0 }]}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{uInitials}</Text>
                  </View>
                  <Text style={styles.userName}>{u.username}</Text>
                  {isMe && <Text style={styles.youBadge}>YOU</Text>}
                </View>
              );
            })}
          </View>

          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                { opacity: pressed || deleting ? 0.7 : 1 },
              ]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                  <Text style={styles.deleteButtonText}>Delete Chat</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ChatRoomDetailsScreen;
