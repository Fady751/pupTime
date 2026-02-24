import api from '../api';
import { TaskTemplate, TaskOverride, getCurrentTimezone } from '../../types/task';

export const formatTime = (date: Date) => {
  return date.toISOString().substring(11, 19);
};

// Helper function to convert TaskTemplate to server format
const toServerTaskData = (task: TaskTemplate) => {
  return {
    id: task?.id,
    title: task.title,
    categories: task?.categories?.map(category => category.id),
    priority: task?.priority,
    emoji: task?.emoji,
    start_datetime: task.startDatetime,
    reminder_time: task?.reminderTime,
    duration_minutes: task?.durationMinutes,
    is_recurring: task?.isRecurring,
    rrule: task?.rrule,
    timezone: task?.timezone ?? getCurrentTimezone(),
    created_at: task?.createdAt,
    updated_at: task?.updatedAt,
    overrides: task?.overrides?.map(override => ({
      id: override.id,
      instance_datetime: override.instanceDatetime,
      status: override.status,
      new_datetime: override.newDatetime,
      created_at: override.createdAt,
      updated_at: override.updatedAt,
    })),
  }
};
const toClientTaskOverride = (data: any): TaskOverride => {
  return {
    id: data?.id,
    instanceDatetime: data?.instance_datetime,
    status: data?.status,
    newDatetime: data?.new_datetime,
    createdAt: data?.created_at,
    updatedAt: data?.updated_at,
  } as TaskOverride;
}
const toClientTaskTemplate = (data: any): TaskTemplate => {
  return {
    id: data.id,
    userId: data.user,
    title: data.title,
    priority: data.priority,
    categories: data.categories,
    emoji: data.emoji,
    startDatetime: data.start_datetime,
    reminderTime: data.reminder_time,
    durationMinutes: data.duration_minutes,
    isRecurring: data.is_recurring,
    rrule: data.rrule,
    timezone: data.timezone,
    overrides: data.overrides?.map((override: any) => toClientTaskOverride(override)),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as TaskTemplate;
};

export const createTaskTemplate = async (taskData: TaskTemplate): Promise<TaskTemplate> => {
  try {
    const response = await api.post('/task/', toServerTaskData(taskData));
    response.data.id = response.data.id.toString();
    return toClientTaskTemplate(response.data);
    } catch (error: any) {
      console.error(error);
      throw error;
    }
};

export type getTasksRequest = {
  page?: number;
  page_size?: number;
  priority?: 'low' | 'medium' | 'high' | 'none';
  start_date?: string;
  end_date?: string;
  category_ids?: number[];
  updated_after?: string;
  ordering?: 'start_time' | '-start_time' | 'priority' | '-priority' | 'end_time' | '-end_time';
};

export type getTasksResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export const getTasks = async (request: getTasksRequest): Promise<getTasksResponse<TaskTemplate>> => {
    try {
      const response = await api.get('/task/', { params: request });
      return {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results: response.data.results.map((task: any) => toClientTaskTemplate(task)),
      };
    } catch (error: any) {
        console.error(error);
    throw error;
  }
};

export const getTaskById = async (id: string): Promise<TaskTemplate> => {
    try {
    const response = await api.get(`/task/${id}`);
    response.data.id = response.data.id.toString();
    return toClientTaskTemplate(response.data);
    } catch (error: any) {
        console.error(error);
    throw error;
  }
};

export const patchTask = async (id: string, task: Partial<TaskTemplate>): Promise<TaskTemplate> => {
    const formattedTaskData: any = {};
    if(task.title) formattedTaskData.title = task.title;
    if(task.categories) formattedTaskData.categories = task.categories.map(category => category.id);
    if(task.priority) formattedTaskData.priority = task.priority;
    if(task.emoji) formattedTaskData.emoji = task.emoji;
    if(task.startDatetime) formattedTaskData.start_datetime = task.startDatetime;
    if(task.reminderTime) formattedTaskData.reminder_time = task.reminderTime;
    if(task.durationMinutes) formattedTaskData.duration_minutes = task.durationMinutes;
    if(task.isRecurring) formattedTaskData.is_recurring = task.isRecurring;
    if(task.rrule) formattedTaskData.rrule = task.rrule;
    if(task.timezone) formattedTaskData.timezone = task.timezone;

    try {
        const response = await api.patch(`/task/${id}`, formattedTaskData);
        return toClientTaskTemplate(response.data);
    } catch (error: any) {
        console.error(error);
    throw error;
  }
};

export const deleteTask = async (id: string): Promise<void> => {
    try {
        await api.delete(`/task/${id}`);
    } catch (error: any) {
        console.error(error);
        throw error;
    };
};

export const historyTask = async (id: string, filter?: {start_date?: string, end_date?: string}): Promise<getTasksResponse<TaskOverride>> => {
    try {
        const response = await api.get(`/task/${id}/history`, { params: filter });
        console.log(response.data);
        return {
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
          results: response.data.results.map((override: any) => toClientTaskOverride(override)),
        };
    } catch (error: any) {
        console.error(error);
    throw error;
  };
};

export const patchTaskOverride = async (id: string, id_override: string, data?: {status: string, new_datetime?: string}): Promise<TaskOverride> => {
    try {
        const response = await api.patch(`/task/${id}/override/${id_override}`, data);
        return toClientTaskOverride(response.data);
    } catch (error: any) {
        console.error(error);
    throw error;
  };
};
