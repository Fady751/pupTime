import api from './api';
import type { HobbySuggestion, NoFriendsResponse } from '../types/recommendation';

/* ═══════════════════════════════════════════════════════════
   Hobby Recommendation API
   ═══════════════════════════════════════════════════════════ */

/**
 * GET /hobby/self/
 * Returns personalised hobby suggestions for the current user.
 */
export const getHobbySelf = async (): Promise<HobbySuggestion[]> => {
  const response = await api.get('/hobby/self/');
  return response.data as HobbySuggestion[];
};

/**
 * GET /hobby/friends/ or GET /hobby/friends/<start>/
 *
 * Returns 3 suggestions per call.
 * ⚠️ Can return `{ message: "User does not have any friends." }` instead
 *    of an array when the user has no accepted friends.
 */
export const getHobbyFriends = async (
  start?: number,
): Promise<HobbySuggestion[] | NoFriendsResponse> => {
  const url =
    start !== undefined && start > 0
      ? `/hobby/friends/${start}/`
      : '/hobby/friends/';

  const response = await api.get(url);
  return response.data as HobbySuggestion[] | NoFriendsResponse;
};
