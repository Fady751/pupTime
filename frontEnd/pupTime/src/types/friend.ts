export type Friend = {
  id: string;
  name: string;
  avatar: string; // URL, emoji, or placeholder
  status?: "active" | "offline";
};

export type FriendRequest = {
  id: string;
  name: string;
  avatar: string;
  requestStatus: "pending" | "sent";
};
