import api from '../api';
import { Message, Conversation } from '../../types/aiConversation';
import { AxiosProgressEvent } from 'axios';
import { AppMetaRepository } from '../../DB/Repositories/AppMetaRepository';

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
export const sendMessage = async (request: { conversation_id?: string, message: string }): Promise<{ id: string, message: Message }> => {
    try {
        console.log("request: ", request);
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

export const approveChoice = async (choice_id: string): Promise<Message> => {
    try {
        const response = await api.post(`/ai/chat/approve-choice/`, { choice_id });
        return response.data;
    } catch (error) {
        console.error('Error approving choice:', error);
        throw error;
    }
};

interface VoiceMessageRequest {
    audioUri: string;
    conversationId?: string;
    message?: string;
    duration?: number;
}

export const sendVoiceMessage = async (request: VoiceMessageRequest, onUploadProgress?: (progressEvent: AxiosProgressEvent) => void): Promise<{ id: string, message: Message }> => {
    try {
        const formData = new FormData();
        console.log("request: ", request.audioUri);
        formData.append('audio', {
            uri: request.audioUri,
            name: 'recording.mp4',
            type: 'audio/mp4',
        } as any);
        if (request.conversationId) {
            formData.append('conversation_id', request.conversationId);
        }
        if (request.message) {
            formData.append('message', request.message);
        }
        if (request.duration) {
            formData.append('duration', request.duration.toString());
        }
        const response = await api.post(`/ai/chat/voice/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                onUploadProgress?.(progressEvent);
            },
        });
        return {
            id: response.data.conversation_id,
            message: response.data.message as Message,
        }
    } catch (error) {
        console.error('Error sending voice message:', error);
        throw error;
    }
};

// ----------------------------- not needed -----------------------------

// export const getVoiceRecording = async (message_id: string) => {
//   try {
//     const response = await api.get(`/ai/voice/${message_id}/`, {
//       responseType: 'blob', 
//     });

//     const audioUrl = URL.createObjectURL(response.data);
//     return audioUrl;
//   } catch (error) {
//     console.error("Error fetching voice recording:", error);
//     throw error;
//   }
// };

export const getVoiceUrl = async (message_id: string): Promise<string | null> => {
  try {
    const response = await api.get(`/ai/voice/${message_id}/`);
    const s3Url = response.request.responseURL;
    return s3Url;
  } catch (error) {
    console.error("Error fetching voice URL:", error);
    return null;
  }
};

import ReactNativeBlobUtil from 'react-native-blob-util';
import { API_URL } from '@env';

export const downloadVoice = async (message_id: string) => {
  const tokenMeta = await AppMetaRepository.get('authToken');
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/voice_${message_id}.m4a`;

  try {
    const res = await ReactNativeBlobUtil.config({
      path: path,
    }).fetch('GET', `${API_URL}/ai/voice/${message_id}/`, {
      Authorization: `token ${tokenMeta?.value}`,
    });

    console.log('File saved to:', res.path());
    return res.path();
  } catch (error) {
    console.error(error);
  }
};
