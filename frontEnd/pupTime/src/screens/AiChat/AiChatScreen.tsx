import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Markdown from 'react-native-markdown-display';

import { AppStackParamList } from '../../navigation/AppNavigator';
import { Message, Choice } from '../../types/aiConversation';
import { getConversation, sendMessage, approveChoice } from '../../services/aiConversationService/aiConversationService';
import { TaskTemplate } from '../../types/task';
import ChoiceSelector from './components/ChoiceSelector';
import useTheme from '../../Hooks/useTheme';
import dayjs from 'dayjs';
import { RootState } from '../../redux/store';

type AiChatScreenRouteProp = RouteProp<AppStackParamList, 'AiChat'>;

const AiChatScreen: React.FC = () => {
    const route = useRoute<AiChatScreenRouteProp>();
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { conversationId: initialConversationId } = route.params || {};

    const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const baseTasks = useSelector((s: RootState) => s.tasks.items) as TaskTemplate[];
    const [sending, setSending] = useState(false);
    
    // Auto-scroll needed
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (conversationId) {
            loadConversation(conversationId);
        }
    }, [conversationId]);

    const loadConversation = async (id: string) => {
        try {
            const conv = await getConversation(id);
            setMessages(conv.messages);
        } catch (error) {
            console.error("Failed to load conversation", error);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        
        // Check if there are pending choices preventing message
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'assistant' && lastMessage.choices?.length && !lastMessage.choices.some(c => c.is_executed)) {
            Alert.alert("Action Required", "Please select an option before continuing.");
            return;
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSending(true);

        try {
            const response = await sendMessage({ 
                conversation_id: conversationId, 
                message: userMsg.content 
            });
            
            if (!conversationId && response.id) {
                setConversationId(response.id);
            }

            setMessages(prev => [...prev, response.message]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    const handleChoiceSelect = async (choice: Choice) => {
        // Optimistically update UI
        // Actually we need to call approveChoice with Choice.id NOT choice_id_string as per user instruction
        try {
            // Find the message that contains this choice
            const msgIndex = messages.findIndex(m => m.choices?.some(c => c.id === choice.id));
            if (msgIndex === -1) return;

            // Mark choice as executed locally to give immediate feedback?
            // Or wait for server response. Server response returns updated Message.
            
            const updatedMessage = await approveChoice(choice.id);
            
            // Update the message in state
            const newMessages = [...messages];
            newMessages[msgIndex] = updatedMessage;
            setMessages(newMessages);

        } catch (error) {
            console.error("Failed to approve choice", error);
            Alert.alert("Error", "Failed to apply choice.");
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        const hasChoices = item.choices && item.choices.length > 0;
        
        // Check executed choice
        const executedChoice = item.choices?.find(c => c.is_executed);

        return (
            <View style={[
                styles.messageContainer, 
                isUser ? styles.userMessage : styles.assistantMessage,
                hasChoices && styles.messageWithChoices
            ]}>
                <View style={[
                    styles.bubble, 
                    isUser ? [styles.userBubble, { backgroundColor: colors.primary }] : [styles.assistantBubble, { backgroundColor: colors.surface }]
                ]}>
                    <Markdown
                        style={{
                            body: {
                                color: isUser ? '#fff' : colors.text,
                                fontSize: 16,
                            },
                            strong: {
                                fontWeight: 'bold',
                            },
                            em: {
                                fontStyle: 'italic',
                            },
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
                        }}
                    >
                        {item.content}
                    </Markdown>
                </View>

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

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: colors.background }]} 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <View style={styles.header}>
                      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
                 </TouchableOpacity>
                      <Text style={[styles.headerTitle, { color: colors.text }]}>Chat</Text>
                      <View style={styles.headerSpacer} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TextInput
                    style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.secondaryText}
                    multiline
                />
                <TouchableOpacity 
                    style={[styles.sendButton, { backgroundColor: sending ? colors.border : colors.primary }]} 
                    onPress={handleSendMessage}
                    disabled={sending}
                >
                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendText}>Send</Text>}
                </TouchableOpacity>
            </View>
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
        padding: 16,
        paddingTop: 50, // Status bar safe area
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
    },
    backText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSpacer: {
        width: 40,
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
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
        padding: 12,
        borderRadius: 16,
    },
    userBubble: {
        borderBottomRightRadius: 2,
    },
    assistantBubble: {
        borderBottomLeftRadius: 2,
    },
    messageText: {
        fontSize: 16,
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    choicePromptText: {
        fontSize: 16,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    choicesContainer: {
        width: '100%',
        marginTop: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 1,
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        marginRight: 10,
    },
    sendButton: {
        width: 50,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendText: {
        color: '#fff',
        fontWeight: 'bold',
    }
});

export default AiChatScreen;
