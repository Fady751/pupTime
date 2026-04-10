import { useState, useEffect, useCallback, useRef } from 'react';
import ChatService, { getRoomMessages } from '../services/chatService';
import type { ChatMessage } from '../types/chat';

const PAGE_SIZE = 20;

export const useChat = (room_id: number) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(1);
  const isLoadingRef = useRef(false);

  // Deduplicate & merge older messages in front of existing ones
  const prependMessages = useCallback((older: ChatMessage[]) => {
    setMessages(prev => {
      const existing = new Set(prev.map(m => m.created_at));
      const unique = older.filter(m => !existing.has(m.created_at));
      return [...unique, ...prev].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
  }, []);

  // Core fetch function (used for initial load & pagination)
  const fetchMessages = useCallback(async (page: number) => {
    if (isLoadingRef.current || !hasMore) return;
    isLoadingRef.current = true;
    setIsLoadingMore(true);

    try {
      const data = await getRoomMessages(room_id, { page, page_size: PAGE_SIZE });
      if (!data.hasMore) setHasMore(false);
      prependMessages(data.results);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [room_id, prependMessages]);

  // Connect WS & load the first page
  useEffect(() => {
    // Reset state when room changes
    setMessages([]);
    setHasMore(true);
    pageRef.current = 1;

    ChatService.connect(room_id);
    fetchMessages(1);

    const unsubscribeMsg = ChatService.onMessage((newMsg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    });

    const unsubscribeStatus = ChatService.onStatusChange((status) => {
      setIsConnected(status);
    });

    return () => {
      unsubscribeMsg();
      unsubscribeStatus();
      ChatService.disconnect();
    };
  }, [room_id, fetchMessages]);

  // Public: load the next page of older messages
  const loadMoreMessages = useCallback(() => {
    if (!hasMore || isLoadingRef.current) return;
    pageRef.current += 1;
    fetchMessages(pageRef.current);
  }, [hasMore, fetchMessages]);

  const sendMessage = useCallback((msg: string) => {
    ChatService.send(msg);
  }, []);

  return { messages, isConnected, isLoadingMore, hasMore, sendMessage, loadMoreMessages };
};

