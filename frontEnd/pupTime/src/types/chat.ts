export type ChatUserBrief = {
  id: number;
  username: string;
};

export type ChatMessage = {
  id: number;
  room: number;
  sender: ChatUserBrief;
  content: string;
  created_at: string;
};

export type ChatRoom = {
  id: number;
  users: ChatUserBrief[];
  created_at: string;
  latest_message: ChatMessage | null;
};

export type ChatSocketPayload = {
  message: string;
  sender: string;
  sender_id: number;
  created_at: string;
};
