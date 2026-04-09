import { API_URL } from '@env';
import { AppMetaRepository } from '../DB/Repositories/AppMetaRepository';
import type { ChatMessage, ChatRoom } from '../types/chat';
import api from './api';

type UserIdPayload = {
  user_id: number;
};

const toWebSocketBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');

  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}`;
  }

  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}`;
  }

  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    return trimmed;
  }

  return `ws://${trimmed}`;
};

export const listChatRooms = async (): Promise<ChatRoom[]> => {
  const response = await api.get('/chat/rooms/');
  return Array.isArray(response.data) ? (response.data as ChatRoom[]) : [];
};

export const createOrFetchDirectRoom = async (userId: number): Promise<ChatRoom> => {
  const response = await api.post('/chat/rooms/', { user_id: userId } as UserIdPayload);
  return response.data as ChatRoom;
};

export const getChatRoomById = async (roomId: number): Promise<ChatRoom> => {
  const response = await api.get(`/chat/rooms/${roomId}/`);
  return response.data as ChatRoom;
};

export const updateChatRoom = async (
  roomId: number,
  payload: Record<string, unknown>,
): Promise<ChatRoom> => {
  const response = await api.patch(`/chat/rooms/${roomId}/`, payload);
  return response.data as ChatRoom;
};

export const deleteChatRoom = async (roomId: number): Promise<void> => {
  await api.delete(`/chat/rooms/${roomId}/`);
};

export const getRoomMessages = async (roomId: number): Promise<ChatMessage[]> => {
  const response = await api.get(`/chat/rooms/${roomId}/messages/`);
  return Array.isArray(response.data) ? (response.data as ChatMessage[]) : [];
};

export const addUserToRoom = async (roomId: number, userId: number): Promise<void> => {
  await api.post(`/chat/rooms/${roomId}/add_user/`, { user_id: userId } as UserIdPayload);
};

export const removeUserFromRoom = async (roomId: number, userId: number): Promise<void> => {
  await api.post(`/chat/rooms/${roomId}/remove_user/`, { user_id: userId } as UserIdPayload);
};

export const buildRoomSocketUrl = async (roomId: number): Promise<string> => {
  const tokenMeta = await AppMetaRepository.get('authToken');
  const token = tokenMeta?.value;

  if (!token) {
    throw new Error('Missing auth token');
  }

  const socketBaseUrl = toWebSocketBaseUrl(API_URL);
  return `${socketBaseUrl}/ws/chat/${roomId}/?token=${encodeURIComponent(token)}`;
};

export const findDirectRoomWithUser = (
  rooms: ChatRoom[],
  currentUserId: number,
  targetUserId: number,
): ChatRoom | undefined =>
  rooms.find(
    room =>
      room.users.length === 2 &&
      room.users.some(user => user.id === currentUserId) &&
      room.users.some(user => user.id === targetUserId),
  );
