import { TaskTemplate, TaskOverride } from "./task";

// ── Task action names (existing) ──────────────────────────────
export type TaskActionName =
  | 'create_TaskTemplate'
  | 'update_TaskTemplate'
  | 'update_TaskOverride'
  | 'delete_TaskTemplate';

// ── Social action names (new) ─────────────────────────────────
export type SocialActionName =
  | 'create_SocialTask'
  | 'update_SocialTask';

// ── Social-task sub-task shape ────────────────────────────────
export type SocialSubTask = {
  title: string;
  description?: string;
  duration_minutes: number;
  scheduled_at?: string | null;
};

// ── What the AI sends in params for social actions ────────────
export type SocialTaskParams = {
  social_task_id?: string;          // required for update_SocialTask
  title?: string;
  description?: string;
  duration_minutes?: number;
  scheduled_at?: string | null;     // ISO 8601, null = no fixed time
  sub_tasks?: SocialSubTask[];      // create only
};

// ── The merged preview the backend renders for the card ───────
export type SocialTaskSnapshot = {
  id: string | null;                // null until approved (create)
  title: string;
  description: string;
  duration_minutes: number | null;
  scheduled_at: string | null;
  status: 'draft' | 'confirmed' | 'cancelled';
  sub_tasks?: SocialSubTask[];      // present on create snapshots
};

// ── Discriminated union: task action OR social action ─────────
export type Action =
  | {
      action_name: TaskActionName;
      params: TaskTemplate | TaskOverride;
      task_snapshot: TaskTemplate | TaskOverride;
    }
  | {
      action_name: SocialActionName;
      params: SocialTaskParams;
      task_snapshot: SocialTaskSnapshot;
    };

export type Choice = {
    id: string;
    choice_id_string: string;
    actions_payload: Action[];
    is_executed: boolean;
    created_at: string;
};


export type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    choices?: Choice[];
    voice_url: string | null;
    voice_duration_seconds: number | null;
    voice_mime_type: string | null;
};

export type Conversation = {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages: Message[];
};
