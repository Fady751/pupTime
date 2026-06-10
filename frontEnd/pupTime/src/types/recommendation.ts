import { TaskTemplate, getCurrentTimezone } from './task';

/* ═══════════════════════════════════════════════════════════
   API Response Types
   ═══════════════════════════════════════════════════════════ */

/**
 * Shape returned by GET /hobby/self/ and GET /hobby/friends/.
 * These are transient proposals — not saved tasks.
 */
export type HobbySuggestion = {
  id: string;
  user: number;
  title: string;
  start_datetime: string;     // ISO 8601, UTC
  duration_minutes: number;   // always 60
  priority: 'none' | 'medium';
  emoji: string;              // "💡"
  categories: unknown[];      // always []
  overrides: unknown[];       // always []
  reminder_time: number | null;
  is_recurring: boolean;      // always false
  rrule: string | null;       // always null
  timezone: string | null;    // always null
  created_at: string;
  updated_at: string | null;
  override: number;           // always 1
  is_overriding: boolean;     // always false
  is_deleted: boolean;        // always false
};

/**
 * GET /hobby/friends/ can return this object instead of an array
 * when the user has no friends.
 */
export type NoFriendsResponse = { message: string };

/** The two recommendation flow types. */
export type RecommendationType = 'self' | 'friends';

/* ═══════════════════════════════════════════════════════════
   Mapper
   ═══════════════════════════════════════════════════════════ */

/**
 * Convert an API suggestion into the app's TaskTemplate shape so it can
 * be displayed, edited, and eventually created as a real task.
 *
 * Key mapping:
 *  - `user` → `user_id`
 *  - `rrule: null` stays null (non-recurring / "once")
 *  - `timezone` defaults to the device timezone
 *  - `overrides` is always []
 */
export const mapSuggestionToTaskTemplate = (
  suggestion: HobbySuggestion,
): TaskTemplate => ({
  id: suggestion.id,
  user_id: suggestion.user,
  title: suggestion.title,
  start_datetime: suggestion.start_datetime,
  duration_minutes: suggestion.duration_minutes,
  priority: suggestion.priority,
  emoji: suggestion.emoji,
  categories: [],
  overrides: [],
  reminder_time: suggestion.reminder_time,
  is_recurring: false,
  rrule: null,
  timezone: getCurrentTimezone(),
  is_deleted: false,
  created_at: suggestion.created_at,
  updated_at: suggestion.updated_at,
});
