import { WS_URL } from '@env';
import { AppMetaRepository } from '../DB/Repositories/AppMetaRepository';
import type { ChatMessage, ChatRoom } from '../types/chat';
import api from './api';

export const listChatRooms = async (input: { page?: number | null, page_size?: number | null }): Promise<ChatRoom[]> => {
  const params = { ...input };
  if (params.page === null) delete params.page;
  if (params.page_size === null) delete params.page_size;
  const response = await api.get('/chat/rooms/', { params });
  return Array.isArray(response.data.results) ? (response.data.results as ChatRoom[]) : [];
};

export const createOrFetchDirectRoom = async (user_id: number): Promise<ChatRoom> => {
  const response = await api.post('/chat/rooms/', { user_id });
  return response.data as ChatRoom;
};

export const getChatRoomById = async (room_id: number): Promise<ChatRoom> => {
  const response = await api.get(`/chat/rooms/${room_id}/`);
  return response.data as ChatRoom;
};

// export const updateChatRoom = async (
//   room_id: number,
//   payload: Record<string, unknown>,
// ): Promise<ChatRoom> => {
//   const response = await api.patch(`/chat/rooms/${room_id}/`, payload);
//   return response.data as ChatRoom;
// };

export const deleteChatRoom = async (roomId: number): Promise<void> => {
  await api.delete(`/chat/rooms/${roomId}/`);
};

export const getRoomMessages = async (room_id: number, { page = 1, page_size = 20 }): Promise<{ results: ChatMessage[], count: number, hasMore: boolean }> => {
  const response = await api.get(`/chat/rooms/${room_id}/messages/`, { params: { page, page_size } });
  return {
    results: Array.isArray(response.data.results) ? (response.data.results as ChatMessage[]) : [],
    count: response.data.count,
    hasMore: response.data.next !== null,
  };
};

export const addUserToRoom = async (room_id: number, user_id: number): Promise<void> => {
  await api.post(`/chat/rooms/${room_id}/add_user/`, { user_id });
};

export const removeUserFromRoom = async (room_id: number, user_id: number): Promise<void> => {
  await api.post(`/chat/rooms/${room_id}/remove_user/`, { user_id });
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


type MessageCallback = (data: ChatMessage) => void;
type StatusCallback = (status: boolean) => void;

class ChatService {
  private socket: WebSocket | null = null;
  private messageListeners: Set<MessageCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  async connect(room_id: number) {
    if (this.socket) this.disconnect();
    const tokenMeta = await AppMetaRepository.get('authToken');

    const url = `${WS_URL}ws/chat/${room_id}/?token=${tokenMeta?.value}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('Connected to Room:', room_id);
      this.notifyStatus(true);
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    };

    this.socket.onmessage = (e) => {
      const res = JSON.parse(e.data);
      const data: ChatMessage = {
        id: Math.floor(Math.random() * 1000000),
        room: room_id,
        sender: {
          id: res.sender_id,
          username: res.sender
        },
        content: res.message,
        created_at: res.created_at,
      };
      
      this.messageListeners.forEach(listener => listener(data));
    };

    this.socket.onclose = (e) => {
      this.notifyStatus(false);
      console.log('Socket Closed:', e.reason);
      this.reconnectTimeout = setTimeout(() => this.connect(room_id), 5000);
    };

    this.socket.onerror = (e) => {
      console.error('Socket Error:', e);
    };
  }

  send(message: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ message }));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.socket?.close();
    this.socket = null;
  }

  onMessage(callback: MessageCallback) {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  onStatusChange(callback: StatusCallback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus(status: boolean) {
    this.statusListeners.forEach(l => l(status));
  }
}

export default new ChatService();
