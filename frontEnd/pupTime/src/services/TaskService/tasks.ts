import api from '../api';
import { TaskTemplate, TaskOverride, getCurrentTimezone } from '../../types/task';

export const formatTime = (date: Date) => {
  return date.toISOString().substring(11, 19);
};

// Helper function to convert TaskTemplate to server format
const toServerTaskData = (task: TaskTemplate) => {
  return {
    ...task,
    categories: task?.categories?.map(category => category.id),
    timezone: task?.timezone ?? getCurrentTimezone(),
  }
};
const toClientTaskOverride = (data: any): TaskOverride => {
  return data as TaskOverride;
}
const toClientTaskTemplate = (data: any): TaskTemplate => {
  return {
    ...data,
    user_id: data.user,
    overrides: data.overrides?.map((override: any) => toClientTaskOverride(override)),
  } as TaskTemplate;
};

export const createTaskTemplate = async (taskData: TaskTemplate): Promise<TaskTemplate> => {
  try {
    const body: any = {
      ...toServerTaskData(taskData),
    }
    if(taskData?.overrides) {
      body.initial_overrides = taskData.overrides;
    }
    const response = await api.post('/task/', body);
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
    const formattedTaskData: any = task;
    if(task.categories) formattedTaskData.categories = task.categories.map(category => category.id);

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

export type patchTaskOverrideResponse = {
  type: 'RESCHEDULED';
  rescheduled: TaskOverride;
  new_instance: TaskOverride;
} | {
  type: 'OTHER';
  override: TaskOverride;
}

export type patchTaskOverrideRequest = {
  status: string;
  new_instance?: {
    new_date: string;
    id?: string;
    status?: string;
  };
}

export const patchTaskOverride = async (id: string, id_override: string, data?: patchTaskOverrideRequest): Promise<patchTaskOverrideResponse> => {
    try {
        const response = await api.patch(`/task/${id}/override/${id_override}`, data);
        if(data?.status === 'RESCHEDULED' && response.data?.new_instance) {
            return {
              type: 'RESCHEDULED',
              rescheduled: toClientTaskOverride(response.data.rescheduled),
              new_instance: toClientTaskOverride(response.data.new_instance),
            };
        }
        return {
          type: 'OTHER',
          override: toClientTaskOverride(response.data),
        };
    } catch (error: any) {
        console.error(error);
    throw error;
  };
};

export const deleteTaskOverride = async (id: string, id_override: string): Promise<void> => {
    try {
        await api.delete(`/task/${id}/override/${id_override}`);
    } catch (error: any) {
        console.error(error);
        throw error;
    };
};
