import { Interests } from "./interests";

export type RepetitionFrequency = 
  | 'once' 
  | 'daily' 
  | 'weekly' 
  | 'monthly'

  | 'sunday' 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday';

export type Task = {
    id: number;
    user_id: number;
    title: string;
    interests: Interests;
    status: 'pending' | 'completed';
    reminderTime: Date;
    priority: 'low' | 'medium' | 'high' | 'none';
    repetition: RepetitionFrequency[];
    emoji: string;
};
