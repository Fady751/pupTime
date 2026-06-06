import api from './api';

export type UserMini = {
  id: number;
  username: string;
};

export type ParticipantDetail = {
  id: string;
  user: UserMini;
  status: 'invited' | 'accepted' | 'declined';
  rsvp_at: string | null;
};

export type SubTask = {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  scheduled_at: string | null;
};

export type PersonalTaskTemplate = {
  id: string;
  title: string;
  start_datetime: string;
  duration_minutes: number;
};

export type SocialTask = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  scheduled_at: string | null;
  status: 'draft' | 'confirmed' | 'cancelled';
  initiator: UserMini;
  participant_count: number;
  accepted_count?: number; // From list endpoint
  my_status: 'invited' | 'accepted' | 'declined' | null;
  participants?: ParticipantDetail[]; // Only in details
  sub_tasks?: SubTask[]; // Only in details
  my_tasks?: PersonalTaskTemplate[]; // Only in details
  created_at: string;
  updated_at?: string;
};

export type CreateSocialTaskPayload = {
  title: string;
  description?: string;
  duration_minutes: number;
  scheduled_at: string | null;
  participant_ids: number[];
  sub_tasks?: { title: string; duration_minutes: number }[];
};

export type EditSocialTaskPayload = {
  title?: string;
  description?: string;
  duration_minutes?: number;
  scheduled_at?: string | null;
};

export type AddSubTaskPayload = {
  title: string;
  description?: string;
  duration_minutes: number;
  scheduled_at?: string | null;
};

const extractList = (data: any): SocialTask[] => {
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
};

export const createSocialTask = async (payload: CreateSocialTaskPayload): Promise<SocialTask> => {
  const response = await api.post('/social-task/', payload);
  return response.data;
};

export const listSocialTasks = async (params?: { page?: number }): Promise<SocialTask[]> => {
  const response = await api.get('/social-task/', { params });
  return extractList(response.data);
};

export const listPendingInvites = async (params?: { page?: number }): Promise<SocialTask[]> => {
  const response = await api.get('/social-task/invites/', { params });
  return extractList(response.data);
};

export const getSocialTaskDetail = async (id: string): Promise<SocialTask> => {
  const response = await api.get(`/social-task/${id}/`);
  return response.data;
};

export const acceptInvite = async (id: string): Promise<{ status: 'draft' | 'confirmed'; participant_status: 'accepted' }> => {
  const response = await api.post(`/social-task/${id}/accept/`);
  return response.data;
};

export const declineInvite = async (id: string): Promise<{ participant_status: 'declined' }> => {
  const response = await api.post(`/social-task/${id}/decline/`);
  return response.data;
};

export const editSocialTask = async (id: string, payload: EditSocialTaskPayload): Promise<SocialTask> => {
  const response = await api.patch(`/social-task/${id}/`, payload);
  return response.data;
};

export const addInlineSubTask = async (id: string, payload: AddSubTaskPayload): Promise<SubTask> => {
  const response = await api.post(`/social-task/${id}/sub-tasks/`, payload);
  return response.data;
};

export const cancelSocialTask = async (id: string): Promise<void> => {
  await api.delete(`/social-task/${id}/`);
};

export const inviteParticipants = async (id: string, participantIds: number[]): Promise<SocialTask> => {
  const response = await api.post(`/social-task/${id}/invite/`, { participant_ids: participantIds });
  return response.data;
};
