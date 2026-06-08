import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Markdown from 'react-native-markdown-display';
import { Send, Mic, ChevronLeft } from 'lucide-react-native';

import { AppStackParamList } from '../../navigation/AppNavigator';
import { Message, Choice } from '../../types/aiConversation';
import {
  getConversation,
  sendMessage,
  approveChoice,
  sendVoiceMessage,
} from '../../services/aiConversationService/aiConversationService';
import { TaskTemplate } from '../../types/task';
import ChoiceSelector from './components/ChoiceSelector';
import VoicePlayer from '../../components/VoicePlayer/VoicePlayer';
import VoiceRecorderPanel from './components/VoiceRecorderPanel';
import { useAudioRecorder } from '../../Hooks/useAudioRecorder';
import useTheme from '../../Hooks/useTheme';
import dayjs from 'dayjs';
import { RootState } from '../../redux/store';

type AiChatScreenRouteProp = RouteProp<AppStackParamList, 'AiChat'>;

const AiChatScreen: React.FC = () => {
  const route = useRoute<AiChatScreenRouteProp>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { conversationId: initialConversationId } = route.params || {};

  // ── State ──────────────────────────────────────────────
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const baseTasks = useSelector((s: RootState) => s.tasks.items) as TaskTemplate[];
  const [sending, setSending] = useState(false);

  // Voice-specific state
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [sendingVoiceId, setSendingVoiceId] = useState<string | null>(null);

  // Refs
  const flatListRef = useRef<FlatList>(null);

  // Audio recorder hook
  const {
    isPaused,
    recordTime,
    recordedUri,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  // ── Load conversation ──────────────────────────────────
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      const conv = await getConversation(id);
      console.log(conv);
      setMessages(conv.messages);
    } catch (error) {
      console.error('Failed to load conversation', error);
    }
  };

  // ── Helpers ────────────────────────────────────────────
  const hasPendingChoices = (): boolean => {
    const lastMessage = messages[messages.length - 1];
    return !!(
      lastMessage?.role === 'assistant' &&
      lastMessage.choices?.length &&
      !lastMessage.choices.some(c => c.is_executed)
    );
  };

  // ── Send text message ─────────────────────────────────
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (hasPendingChoices()) {
      Alert.alert(
        'Action Required',
        'Please select an option before continuing.',
      );
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
      voice_url: null,
      voice_duration_seconds: null,
      voice_mime_type: null,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const response = await sendMessage({
        conversation_id: conversationId,
        message: userMsg.content,
      });
      if (!conversationId && response.id) {
        setConversationId(response.id);
      }
      setMessages(prev => [...prev, response.message]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // ── Voice recording controls ──────────────────────────
  const handleStartRecording = async () => {
    if (hasPendingChoices()) {
      Alert.alert(
        'Action Required',
        'Please select an option before sending a message.',
      );
      return;
    }
    await startRecording();
    setIsRecordingMode(true);
  };

  const handleDeleteRecording = async () => {
    await stopRecording();
    await clearRecording();
    setIsRecordingMode(false);
  };

  const handleSendVoice = async () => {
    await stopRecording();
    const audioUri = recordedUri;
    if (!audioUri) {
      Alert.alert('Error', 'No recording found.');
      setIsRecordingMode(false);
      return;
    }

    const tempId = `voice_${Date.now()}`;
    const userMsg: Message = {
      id: tempId,
      role: 'user',
      content: '',
      created_at: new Date().toISOString(),
      voice_url: audioUri,
      voice_duration_seconds: null,
      voice_mime_type: 'audio/mp4',
    };

    setMessages(prev => [...prev, userMsg]);
    setIsRecordingMode(false);
    setSending(true);
    setUploadProgress(0);
    setSendingVoiceId(tempId);

    try {
      const response = await sendVoiceMessage(
        { audioUri, conversationId },
        event => {
          if (event.total) {
            setUploadProgress(event.loaded / event.total);
          }
        },
      );
      if (!conversationId && response.id) {
        setConversationId(response.id);
      }
      setMessages(prev => [...prev, response.message]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to send voice message.');
    } finally {
      setSending(false);
      setUploadProgress(null);
      setSendingVoiceId(null);
    }
  };

  // ── Choice selection ──────────────────────────────────
  const handleChoiceSelect = async (choice: Choice) => {
    try {
      const msgIndex = messages.findIndex(m =>
        m.choices?.some(c => c.id === choice.id),
      );
      if (msgIndex === -1) return;

      const updatedMessage = await approveChoice(choice.id);
      const newMessages = [...messages];
      newMessages[msgIndex] = updatedMessage;
      setMessages(newMessages);
    } catch (error) {
      console.error('Failed to approve choice', error);
      Alert.alert('Error', 'Failed to apply choice.');
    }
  };

  // ── Render message item ───────────────────────────────
  const renderItem = ({ item }: { item: Message }) => {
    if (item.role === 'system') return null;

    const isUser = item.role === 'user';
    const hasVoice = !!item.voice_url;
    const hasText = !!item.content?.trim();
    const hasChoices = item.choices && item.choices.length > 0;
    const executedChoice = item.choices?.find(c => c.is_executed);
    const isUploading = sendingVoiceId === item.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
          hasChoices && styles.messageWithChoices,
        ]}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            {
              backgroundColor: isUser ? colors.primary : colors.surface,
            },
          ]}>
          {/* Voice player */}
          {hasVoice && (
            <VoicePlayer
              s3Url={item.voice_url!}
              isUserMessage={isUser}
              colors={colors}
            />
          )}

          {/* Text content */}
          {hasText && (
            <View style={hasVoice ? styles.textAfterVoice : undefined}>
              <Markdown
                style={{
                  body: {
                    color: isUser ? '#fff' : colors.text,
                    fontSize: 16,
                  },
                  strong: { fontWeight: 'bold' },
                  em: { fontStyle: 'italic' },
                  code_inline: {
                    backgroundColor: colors.surface,
                    paddingHorizontal: 4,
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    color: colors.text,
                  },
                  code_block: {
                    backgroundColor: colors.surface,
                    padding: 8,
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    color: colors.text,
                  },
                }}>
                {item.content}
              </Markdown>
            </View>
          )}

          {/* Upload progress bar */}
          {isUploading && uploadProgress !== null && (
            <View
              style={[
                styles.progressContainer,
                {
                  backgroundColor: isUser
                    ? 'rgba(255,255,255,0.15)'
                    : colors.border + '40',
                },
              ]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.max(5, uploadProgress * 100)}%`,
                    backgroundColor: isUser
                      ? 'rgba(255,255,255,0.8)'
                      : colors.primary,
                  },
                ]}
              />
            </View>
          )}
        </View>

        {/* Choices */}
        {hasChoices && (
          <View style={styles.choicesContainer}>
            <ChoiceSelector
              choices={item.choices!}
              onSelect={handleChoiceSelect}
              executedChoiceId={executedChoice?.id}
            />
          </View>
        )}

        <Text style={[styles.timestamp, { color: colors.secondaryText }]}>
          {dayjs(item.created_at).format('h:mm A')}
        </Text>
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <ChevronLeft size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          AI Chat
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Bottom area: recording panel or text input */}
      {isRecordingMode ? (
        <VoiceRecorderPanel
          isPaused={isPaused}
          recordTime={recordTime}
          onPause={pauseRecording}
          onResume={resumeRecording}
          onDelete={handleDeleteRecording}
          onSend={handleSendVoice}
          colors={colors}
        />
      ) : (
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.background },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.secondaryText}
            multiline
            editable={!sending}
          />

          {input.trim() ? (
            /* Send text button */
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: sending ? colors.border : colors.primary,
                },
              ]}
              onPress={handleSendMessage}
              disabled={sending}
              activeOpacity={0.7}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            /* Mic button */
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: sending ? colors.border : colors.primary,
                },
              ]}
              onPress={handleStartRecording}
              disabled={sending}
              activeOpacity={0.7}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Mic size={20} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageWithChoices: {
    maxWidth: '100%',
    width: '100%',
  },
  bubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  textAfterVoice: {
    marginTop: 8,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  choicesContainer: {
    width: '100%',
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'flex-end',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 6,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 14 : 12,
    paddingBottom: Platform.OS === 'ios' ? 14 : 12,
    marginRight: 12,
    fontSize: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default AiChatScreen;
