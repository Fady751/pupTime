import api from '../api';
import { Task, TaskRepetition } from '../../types/task';
import { getCategories } from '../interestService/getCategories';

export const formatTime = (date: Date) => {
  return date.toISOString().substring(11, 19);
};

export const createTask = async (taskData: Task): Promise<Task> => {
  const formattedTaskData = {
    title: taskData.title,
    categories: taskData.Categorys.map(category => category.id),
    status: taskData.status,
    reminder_time: taskData.reminderTime,
    start_time: taskData.startTime.toISOString(),
    end_time: taskData.endTime ? taskData.endTime.toISOString() : null,
    priority: taskData.priority,
    emoji: taskData.emoji,
    repetitions: taskData.repetition.map(rep => ({
      frequency: rep.frequency,
      time: rep.time ? formatTime(rep.time) : null,
    })),
  };
  try {
    const response = await api.post('/task/', formattedTaskData);
    response.data.id = response.data.id.toString();
    return response.data;
    } catch (error: any) {
        console.error(error);
    throw error;
  }
};

export type getTasksRequest = {
  page?: number;
  page_size?: number;
  status?: 'pending' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'none';
  category?: number;
  ordering?: 'start_time' | '-start_time' | 'priority' | '-priority' | 'end_time' | '-end_time';
};

export type getTasksResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Task[];
};

export const getTasks = async (request: getTasksRequest): Promise<getTasksResponse> => {
    try {
      const response = await api.get('/task/', { params: request });

      const categories = await getCategories();

      const results: Task[] = response.data.results.map((task: any) => {
        const taskCategories = task.categories.map((catId: number) => {
          const category = categories.find(c => c.id === catId);
          return category ? { id: category.id, name: category.name } : null;
        }).filter((cat: any) => cat !== null);
        return {
            ...task,
            repetition: task.repetitions as TaskRepetition[],
            id: task.id.toString(),
            user_id: task.user,
            Categorys: taskCategories,
            reminderTime: task.reminder_time,
            startTime: new Date(task.start_time),
            endTime: task.end_time ? new Date(task.end_time) : null,
        };
      });

      console.log('Fetched tasks:', results);

      return {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results,
      };
    } catch (error: any) {
        console.error(error);
    throw error;
  }
};

export const getTaskById = async (id: string): Promise<Task> => {
    try {
    const response = await api.get(`/task/${id}`);
    response.data.id = response.data.id.toString();
    return response.data;
    } catch (error: any) {
        console.error(error);
    throw error;
  }
};

export const updateTask = async (id: string, taskData: Task): Promise<Task> => {
  const formattedTaskData = {
    title: taskData.title,
    categories: taskData.Categorys.map(category => category.id),
    status: taskData.status,
    reminder_time: taskData.reminderTime,
    start_time: taskData.startTime.toISOString(),
    end_time: taskData.endTime ? taskData.endTime.toISOString() : null,
    priority: taskData.priority,
    emoji: taskData.emoji,
    repetitions: taskData.repetition.map(rep => ({
      frequency: rep.frequency,
      time: rep.time ? formatTime(rep.time) : null,
    })),
  };
    try {
        const response = await api.put(`/task/${id}`, formattedTaskData);
        response.data.id = response.data.id.toString();
        return response.data;
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

export const patchTask = async (id: string, taskData: Partial<Task>): Promise<Task> => {
    const formattedTaskData: any = {};
    if (taskData.title) formattedTaskData.title = taskData.title;
    if (taskData.Categorys) formattedTaskData.categories = taskData.Categorys.map(category => category.id);
    if (taskData.status) formattedTaskData.status = taskData.status;
    if (taskData.reminderTime !== undefined) formattedTaskData.reminder_time = taskData.reminderTime;
    if (taskData.startTime) formattedTaskData.start_time = taskData.startTime.toISOString();
    if (taskData.endTime !== undefined) formattedTaskData.end_time = taskData.endTime ? taskData.endTime.toISOString() : null;
    if (taskData.priority) formattedTaskData.priority = taskData.priority;
    if (taskData.emoji) formattedTaskData.emoji = taskData.emoji;
    if (taskData.repetition) {
        formattedTaskData.repetitions = taskData.repetition.map(rep => ({
            frequency: rep.frequency,
            time: rep.time ? formatTime(rep.time) : null,
        }));
    }

    try {
        const response = await api.patch(`/task/${id}`, formattedTaskData);
        response.data.id = response.data.id.toString();
        return response.data;
    } catch (error: any) {
        console.error(error);
    throw error;
  }
};
