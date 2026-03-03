import { Category } from "./category";
import { RRule } from 'rrule';

import { TaskTemplate as _TaskTemplate, TaskOverride as _TaskOverride } from '../DB/schema'

export type TaskTemplate = _TaskTemplate & { categories?: Category[], overrides: TaskOverride[] };

export type TaskOverride = _TaskOverride & { template?: TaskTemplate };

export type status = 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'RESCHEDULED' | 'FAILED';

/* ── Date helpers ─────────────────────────────────────── */

/**
* 1. Use Intl.DateTimeFormat to format the date in the specific timezone
* We request the parts (year, month, day) separately to build "YYYY-MM-DD" manually
* This avoids locale issues (e.g. US is MM/DD/YYYY, UK is DD/MM/YYYY)
*/
export const toLocalDateString = (s: string | Date, timeZone?: string): string => {
  const date = new Date(s);
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timeZone || getCurrentTimezone(),
  };
  return new Intl.DateTimeFormat('en-CA', options).format(date);
};

// Returns IANA string like "Africa/Cairo", "America/New_York"
export const getCurrentTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    console.warn('Could not determine timezone, defaulting to UTC', e);
    return 'UTC'; // Fallback just in case
  }
};

/** 
 * Convert a datetime string to a Date object, but set the time to 00:00:00 local time.
 * Useful for comparing just the date portion without time.
 */
export const toDateOnly = (d: string): Date => {
    const result = new Date(d);
    result.setHours(0, 0, 0, 0);
    return result;
};

/**
 * Check if two datetimes fall on the same calendar day in local time.
 */
export const isSameDay = (s1: string, s2: string): boolean => {
    const d1 = new Date(s1), d2 = new Date(s2);
    return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

/**
    * Check if a date falls within a task's active range (start to end).
*/
export const isDateInRange = (date: string, start: string, end: string | null): boolean => {
    const dateOnly = toDateOnly(date);
    const startOnly = toDateOnly(start);
    if (dateOnly < startOnly) return false;
    if (end) {
        const endOnly = toDateOnly(end);
        if (dateOnly > endOnly) return false;
    }
    return true;
};

/**
 * Check whether a task is completed for a specific date.
 * Compares only the YYYY-MM-DD portion.
 */
export const isTaskCompletedForDate = (task: TaskOverride, date: string): boolean => {
    return task.status === 'COMPLETED'
    && toLocalDateString(task.instance_datetime, task?.template?.timezone ?? 'UTC')
    === toLocalDateString(date, task?.template?.timezone ?? 'UTC');
};

/*
 * Determine whether a task falls on a specific calendar date,
 * considering its start/end range, repetition rules,
 * AND whether a completion record exists for that date
 * (so historical completions survive repetition edits).
 */
export const isTaskOnDate = (task: TaskTemplate, date: string): boolean => {
  if (task.is_deleted) return false;
  if (!task.start_datetime) return false;

  const taskStart = new Date(task.start_datetime);
  const targetDate = new Date(date);

  // 2. Non-Recurring Logic (Simple Date Comparison)
  if (!task.is_recurring || !task.rrule) {
    return isSameDay(task.start_datetime, date);
  }

  try {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const ruleOptions = RRule.parseString(task.rrule);
    ruleOptions.dtstart = taskStart;

    const rule = new RRule(ruleOptions);

    const occurrences = rule.between(startOfDay, endOfDay, true);

    return occurrences.length > 0;
  } catch (error) {
    console.warn(`[isTaskOnDate] Failed to parse RRule for task ${task.id}`, error);
    return isSameDay(task.start_datetime, date);
  }
};

/**
 * Returns all occurrence Dates for a task within the next 30 days (or specified window).
 */
export const getTaskOccurrences = (
  task: TaskTemplate,
  windowStart: Date = new Date(),
  daysForward: number = 30
): string[] => {
  if (task.is_deleted || !task.start_datetime) return [];

  const taskStart = new Date(task.start_datetime);
  
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + daysForward);
  windowEnd.setHours(23, 59, 59, 999);

  if (!task.is_recurring || !task.rrule) {
    if (taskStart >= windowStart && taskStart <= windowEnd) {
      return [task.start_datetime];
    }
    return [];
  }

  try {
    const ruleOptions = RRule.parseString(task.rrule);
    ruleOptions.dtstart = taskStart;
    
    const rule = new RRule(ruleOptions);

    return rule.between(windowStart, windowEnd, true).map(d => d.toISOString());
  } catch (error) {
    console.warn(`Failed to parse recurrence for task ${task.id}`, error);
    return [];
  }
};

/**
 * Whether the user is allowed to complete a task for the given date.
 * Rule: cannot complete for a future date (tomorrow or later).
 */
export const canCompleteForDate = (date: string): boolean => {
    return toDateOnly(new Date().toISOString()) <= toDateOnly(date);
};
