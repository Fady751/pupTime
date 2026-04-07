import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { getConversations, deleteConversation } from '../../services/aiConversationService/aiConversationService';
import { Conversation } from '../../types/aiConversation';
import dayjs from 'dayjs';
import useTheme from '../../Hooks/useTheme';

const AiConversationListScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const { colors } = useTheme();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    const loadConversations = async () => {
        try {
            const data = await getConversations();
            // sort by updated_at desc
            data.sort((a, b) => dayjs(b.updated_at).diff(dayjs(a.updated_at)));
            setConversations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadConversations();
        });
        return unsubscribe;
    }, [navigation]);

    const handleCreateNewChat = () => {
        navigation.navigate('AiChat', { conversationId: undefined });
    };

    const handleOpenChat = (conversationId: string) => {
        navigation.navigate('AiChat', { conversationId });
    };

    const handleDeleteChat = async (conversationId: string) => {
        try {
            await deleteConversation(conversationId);
            setConversations(prev => prev.filter(conversation => conversation.id !== conversationId));
        } catch (error) {
            console.error(error);
        }
    };

    const handleConfirmDeleteChat = (conversationId: string) => {
        Alert.alert(
            'Delete chat?',
            'Are you sure you want to delete this chat? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDeleteChat(conversationId),
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: Conversation }) => (
        <TouchableOpacity 
            style={[styles.itemContainer, { backgroundColor: colors.surface }]} 
            onPress={() => handleOpenChat(item.id)}
            onLongPress={() => handleConfirmDeleteChat(item.id)}
        >
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {item.title || "New Chat"}
                </Text>
                <Text style={[styles.date, { color: colors.secondaryText }]}>
                    {dayjs(item.updated_at).format('MMM D, h:mm A')}
                </Text>
            </View>
            <Text style={[styles.messagePreview, { color: colors.secondaryText }]} numberOfLines={1}>
                {item.messages && item.messages.length > 0
                    ? item.messages[item.messages.length - 1].content
                    : "No messages yet"}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>AI Conversations</Text>
                <TouchableOpacity onPress={handleCreateNewChat} style={styles.newChatButton}>
                    <Text style={styles.newChatButtonText}>+</Text>
                </TouchableOpacity>
            </View>
            
            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No conversations yet.</Text>
                            <TouchableOpacity style={styles.createButton} onPress={handleCreateNewChat}>
                                <Text style={styles.createButtonText}>Start a new chat</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    newChatButton: {
        backgroundColor: '#4F46E5',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    newChatButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: -2
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    textContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    date: {
        fontSize: 12,
    },
    messagePreview: {
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        marginBottom: 20,
    },
    loadingIndicator: {
        marginTop: 20,
    },
    createButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '600',
    }
});

export default AiConversationListScreen;
