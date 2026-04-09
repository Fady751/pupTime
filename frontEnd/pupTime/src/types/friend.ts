export type Friend = {
  id: string;
  name: string;
  avatar: string;
  status?: "active" | "offline";
  email?: string;
  streakCount?: number;
};

export type RequestDirection = "incoming" | "outgoing";

export type FriendRequest = {
  id: string;
  friendshipId: number;
  userId: number;
  name: string;
  avatar: string;
  direction: RequestDirection;
  requestStatus: "pending" | "sent";
  sentAt?: string;
};

export type BlockedFriend = {
  id: string;
  friendshipId: number;
  userId: number;
  name: string;
  avatar: string;
  blockedBy: number | null;
};
