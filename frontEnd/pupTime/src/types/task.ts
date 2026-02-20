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

export type Task = {
    id: string;
    user_id: number;
    title: string;
    Categorys: Category[];
    status: 'pending' | 'completed';
    reminderTime: number | null; // number of minutes before the task is due to send a reminder, null if no reminder is set
    startTime: Date;
    endTime: Date | null; // endTime can be null if the task forever
    priority: 'low' | 'medium' | 'high' | 'none';
    repetition: TaskRepetition[];
    emoji: string;
};

export type TaskCompletion = {
    id: string;
    completion_time?: Date;
    task_id?: string;
    date?: Date;
};
