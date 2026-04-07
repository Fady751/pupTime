import api from './api';
import type { BlockedFriend, Friend, FriendRequest } from '../types/friend';

const FRIENDSHIP_STATUS = {
  PENDING: 0,
  ACCEPTED: 1,
  CANCELLED: 2,
  BLOCKED: 3,
} as const;

type FriendshipSnapshot = {
  id: number;
  sender_id: number;
  receiver_id: number;
  blocked_by_id: number | null;
  status: number;
  sent_at: string;
  accepted_at: string | null;
};

type UserDetails = {
  id: number;
  username: string;
  email?: string;
  streak_cnt?: number;
};

type IncomingRequestResponse = {
  id: number;
  sender: {
    id: number;
    username: string;
    streak_cnt?: number;
    gender?: string | null;
  };
  sent_at?: string;
};

export type SearchUser = {
  id: number;
  username: string;
  email?: string;
};

const getDisplayName = (user: UserDetails | undefined, fallbackUserId: number): string => {
  if (user?.username) {
    return user.username;
  }
  return `User #${fallbackUserId}`;
};

const toFriend = (user: UserDetails): Friend => ({
  id: user.id.toString(),
  name: user.username,
  avatar: '',
  status: 'active',
  email: user.email,
  streakCount: user.streak_cnt,
});

const isNotFoundResponse = (error: any): boolean => error?.response?.status === 404;

const getUserProfileInternal = async (userId: number): Promise<UserDetails | null> => {
  try {
    const response = await api.get(`/user/${userId}/`);
    return response.data as UserDetails;
  } catch (error) {
    if (isNotFoundResponse(error)) {
      return null;
    }
    throw error;
  }
};

const getUsersMap = async (userIds: number[]): Promise<Map<number, UserDetails>> => {
  const ids = [...new Set(userIds.filter(Boolean))];
  const users = await Promise.all(ids.map(id => getUserProfileInternal(id)));

  const map = new Map<number, UserDetails>();
  users.forEach(user => {
    if (user?.id != null) {
      map.set(user.id, user);
    }
  });
  return map;
};

export const extractApiErrorMessage = (error: any, fallback = 'Something went wrong'): string => {
  const data = error?.response?.data;

  if (typeof data === 'string') {
    return data;
  }

  if (data?.error && typeof data.error === 'string') {
    return data.error;
  }

  if (data?.message && typeof data.message === 'string') {
    return data.message;
  }

  return error?.message || fallback;
};

export const getUserProfileById = async (userId: number): Promise<UserDetails | null> => {
  return getUserProfileInternal(userId);
};

export const getFriendshipSnapshot = async (): Promise<FriendshipSnapshot[]> => {
  const response = await api.get('/friendship/check/');
  if (!Array.isArray(response.data)) {
    return [];
  }
  return response.data as FriendshipSnapshot[];
};

export const getFriends = async (userId: number): Promise<Friend[]> => {
  try {
    const response = await api.get(`/user/${userId}/friends/`);
    if (!Array.isArray(response.data)) {
      return [];
    }
    return (response.data as UserDetails[]).map(toFriend);
  } catch (error) {
    if (isNotFoundResponse(error)) {
      return [];
    }
    throw error;
  }
};

export const getPendingRequests = async (currentUserId: number): Promise<FriendRequest[]> => {
  const [snapshot, incomingResponse] = await Promise.all([
    getFriendshipSnapshot(),
    api.get('/user/requests/').catch(error => {
      if (isNotFoundResponse(error)) {
        return { data: [] };
      }
      throw error;
    }),
  ]);

  const incomingData: IncomingRequestResponse[] = Array.isArray(incomingResponse.data)
    ? incomingResponse.data
    : [];

  const incomingFromEndpoint: FriendRequest[] = incomingData.map(item => ({
    id: item.id.toString(),
    friendshipId: item.id,
    userId: item.sender.id,
    name: item.sender.username,
    avatar: '',
    direction: 'incoming',
    requestStatus: 'pending',
    sentAt: item.sent_at,
  }));

  const incomingIds = new Set(incomingFromEndpoint.map(item => item.friendshipId));

  const pendingRelations = snapshot.filter(
    relation =>
      relation.status === FRIENDSHIP_STATUS.PENDING &&
      (relation.sender_id === currentUserId || relation.receiver_id === currentUserId),
  );

  if (!pendingRelations.length) {
    return incomingFromEndpoint;
  }

  const fallbackIncomingRelations = pendingRelations.filter(
    relation => relation.receiver_id === currentUserId && !incomingIds.has(relation.id),
  );

  const outgoingRelations = pendingRelations.filter(
    relation => relation.sender_id === currentUserId,
  );

  const relatedUserIds = pendingRelations.map(relation =>
    relation.sender_id === currentUserId ? relation.receiver_id : relation.sender_id,
  );
  const usersMap = await getUsersMap(relatedUserIds);

  const incomingFromSnapshot = fallbackIncomingRelations.map(relation => {
    const otherUserId = relation.sender_id;
    const user = usersMap.get(otherUserId);

    return {
      id: relation.id.toString(),
      friendshipId: relation.id,
      userId: otherUserId,
      name: getDisplayName(user, otherUserId),
      avatar: '',
      direction: 'incoming' as const,
      requestStatus: 'pending' as const,
      sentAt: relation.sent_at,
    };
  });

  const outgoingRequests = outgoingRelations.map(relation => {
    const otherUserId = relation.receiver_id;
    const user = usersMap.get(otherUserId);

    return {
      id: relation.id.toString(),
      friendshipId: relation.id,
      userId: otherUserId,
      name: getDisplayName(user, otherUserId),
      avatar: '',
      direction: 'outgoing' as const,
      requestStatus: 'sent' as const,
      sentAt: relation.sent_at,
    };
  });

  return [...incomingFromEndpoint, ...incomingFromSnapshot, ...outgoingRequests];
};

export const getBlockedUsers = async (currentUserId: number): Promise<BlockedFriend[]> => {
  const snapshot = await getFriendshipSnapshot();
  const blockedRelations = snapshot.filter(
    relation =>
      relation.status === FRIENDSHIP_STATUS.BLOCKED &&
      relation.blocked_by_id === currentUserId,
  );

  if (!blockedRelations.length) {
    return [];
  }

  const blockedUserIds = blockedRelations.map(relation =>
    relation.sender_id === currentUserId ? relation.receiver_id : relation.sender_id,
  );
  const usersMap = await getUsersMap(blockedUserIds);

  return blockedRelations.map(relation => {
    const blockedUserId =
      relation.sender_id === currentUserId ? relation.receiver_id : relation.sender_id;
    const blockedUser = usersMap.get(blockedUserId);

    return {
      id: relation.id.toString(),
      friendshipId: relation.id,
      userId: blockedUserId,
      name: getDisplayName(blockedUser, blockedUserId),
      avatar: '',
      blockedBy: relation.blocked_by_id,
    };
  });
};

export const sendFriendRequest = async (userId: number, fcmToken?: string): Promise<void> => {
  const payload: Record<string, string> = {};
  if (fcmToken?.trim()) {
    payload.fcm_token = fcmToken.trim();
  }

  await api.post(`/friendship/request/${userId}/`, payload);
};

export const acceptFriendRequest = async (
  friendshipId: number,
  fcmToken?: string,
): Promise<void> => {
  const payload: Record<string, string> = {};

  if (fcmToken?.trim()) {
    payload.fcm_token = fcmToken.trim();
  }

  await api.post(`/friendship/accept/${friendshipId}/`, payload);
};

export const cancelFriendRequest = async (friendshipId: number): Promise<void> => {
  await api.delete(`/friendship/cancel/${friendshipId}/`, { data: {} });
};

export const blockUser = async (userId: number): Promise<void> => {
  await api.post(`/friendship/block/${userId}/`, {});
};

export const unblockUser = async (userId: number): Promise<void> => {
  await api.delete(`/friendship/unblock/${userId}/`, { data: {} });
};

export const searchUsers = async (query: string): Promise<SearchUser[]> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const response = await api.get(`/user/search/${encodeURIComponent(trimmed)}/`);

  if (!Array.isArray(response.data)) {
    return [];
  }

  return response.data as SearchUser[];
};
