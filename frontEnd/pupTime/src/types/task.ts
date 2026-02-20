import { Category } from "./category";

export type RepetitionFrequency =  
  | 'once' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'yearly' 

  | 'sunday' 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday';

export type TaskRepetition = {
  frequency: RepetitionFrequency;
  time: Date | null; // time can be null if the repetition for all day
};

export type TaskCompletion = {
    id: string;
    task_id: string;
    completion_time: Date;
    date: Date; // the specific occurrence date this completion is for (e.g., 2026-02-20)
};

export type Task = {
    id: string;
    user_id: number;
    title: string;
    Categorys: Category[];
    completions: TaskCompletion[]; // sparse: only dates the user has actually completed
    reminderTime: number | null; // number of minutes before the task is due to send a reminder, null if no reminder is set
    startTime: Date;
    endTime: Date | null; // endTime can be null if the task forever
    priority: 'low' | 'medium' | 'high' | 'none';
    repetition: TaskRepetition[];
    emoji: string;
};

/* ── Date helpers ─────────────────────────────────────── */

/**
 * Return "YYYY-MM-DD" in LOCAL time (not UTC).
 * Using toISOString().substring(0,10) is wrong because ISO
 * converts to UTC first, which can shift the date by ±1 day.
 */
export const toLocalDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const toDateOnly = (d: Date): Date => {
    const result = new Date(d);
    result.setHours(0, 0, 0, 0);
    return result;
};

const isSameDay = (d1: Date, d2: Date): boolean =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const isDateInRange = (date: Date, start: Date, end: Date | null): boolean => {
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
export const isTaskCompletedForDate = (task: Task, date: Date): boolean => {
    const dateStr = toLocalDateString(date);
    return task.completions.some(
        c => toLocalDateString(c.date) === dateStr,
    );
};

/**
 * Determine whether a task falls on a specific calendar date,
 * considering its start/end range, repetition rules,
 * AND whether a completion record exists for that date
 * (so historical completions survive repetition edits).
 */
export const isTaskOnDate = (task: Task, date: Date): boolean => {
    // A completion on this date always means the task "belongs" here
    if (isTaskCompletedForDate(task, date)) return true;

    const startDate = new Date(task.startTime);
    const endDate = task.endTime ? new Date(task.endTime) : null;

    if (!isDateInRange(date, startDate, endDate)) return false;

    const hasRepetition = task.repetition && task.repetition.length > 0;
    const hasOnce = hasRepetition && task.repetition.some(r => r.frequency === 'once');

    if (!hasRepetition || hasOnce) return isSameDay(startDate, date);

    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (const rep of task.repetition) {
        const freq = rep.frequency;
        if (freq === 'daily') return true;
        if (freq === 'weekly' && startDate.getDay() === dayOfWeek) return true;
        if (freq === 'monthly' && startDate.getDate() === date.getDate()) return true;
        if (freq === 'yearly' && startDate.getDate() === date.getDate() && startDate.getMonth() === date.getMonth()) return true;
        if (dayNames.includes(freq) && dayNames[dayOfWeek] === freq) return true;
    }

    return false;
};

/**
 * Whether the user is allowed to complete a task for the given date.
 * Rule: cannot complete for a future date (tomorrow or later).
 */
export const canCompleteForDate = (date: Date): boolean => {
    const today = toDateOnly(new Date());
    const target = toDateOnly(date);
    return target <= today;
};

/**
 * Whether a task is scheduled on a date by its REPETITION rules only
 * (ignores completions). Used internally when we need pure schedule logic
 * without the "show completion" fallback.
 */
export const isTaskScheduledOnDate = (task: Task, date: Date): boolean => {
    const startDate = new Date(task.startTime);
    const endDate = task.endTime ? new Date(task.endTime) : null;

    if (!isDateInRange(date, startDate, endDate)) return false;

    const hasRepetition = task.repetition && task.repetition.length > 0;
    const hasOnce = hasRepetition && task.repetition.some(r => r.frequency === 'once');

    if (!hasRepetition || hasOnce) return isSameDay(startDate, date);

    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (const rep of task.repetition) {
        const freq = rep.frequency;
        if (freq === 'daily') return true;
        if (freq === 'weekly' && startDate.getDay() === dayOfWeek) return true;
        if (freq === 'monthly' && startDate.getDate() === date.getDate()) return true;
        if (freq === 'yearly' && startDate.getDate() === date.getDate() && startDate.getMonth() === date.getMonth()) return true;
        if (dayNames.includes(freq) && dayNames[dayOfWeek] === freq) return true;
    }

    return false;
};

/**
 * Get the completion record for a specific date, or undefined if not completed.
 */
export const getCompletionForDate = (task: Task, date: Date): TaskCompletion | undefined => {
    const dateStr = toLocalDateString(date);
    return task.completions.find(
        c => toLocalDateString(c.date) === dateStr,
    );
};
