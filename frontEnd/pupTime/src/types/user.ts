export type User = {
  id: number;
  username: string;
  email: string;
  google_auth_id: string | null;
  gender: string;
  birth_day: Date;
  streak_cnt: number;
  joined_on: Date;
  token: string;
  has_interests?: string;
};