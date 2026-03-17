import { TaskTemplate, TaskOverride } from "./task";

export type Action = {
    action_name: string;
    params: TaskTemplate | TaskOverride;
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
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
    choices?: Choice[];
};

export type Conversation = {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages: Message[];
};
