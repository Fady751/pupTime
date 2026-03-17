import api from '../api';
import { Message, Conversation } from '../../types/aiConversation';

export const getConversations = async (): Promise<Conversation[]> => {
    try {
        const response = await api.get('/ai/conversations/');
        return response.data;
    } catch (error) {
        console.error('Error fetching conversations:', error);
        throw error;
    }
};

export const getConversation = async (conversation_id: string): Promise<Conversation> => {
    try {
        const response = await api.get(`/ai/conversations/${conversation_id}/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching conversation:', error);
        throw error;
    }
};

export const deleteConversation = async (conversation_id: string): Promise<void> => {
    try {
        await api.delete(`/ai/conversations/${conversation_id}/`);
    } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
    }
};

// If conversation_id is undefined, it will create a new conversation
export const sendMessage = async ( request: { conversation_id?: string, message: string } ): Promise<{id: string, message: Message}> => {
    try {
        const response = await api.post(`/ai/chat/`, request);
        console.log("response: ", response);
        return {
            id: response.data.conversation_id,
            message: response.data.message as Message,
        }
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// ========================= not working =========================
export const approveChoice = async (choice_id: string): Promise<Message> => {
    try {
        const response = await api.post(`/ai/chat/approve-choice/`, { choice_id });
        return response.data;
    } catch (error) {
        console.error('Error approving choice:', error);
        throw error;
    }
};
