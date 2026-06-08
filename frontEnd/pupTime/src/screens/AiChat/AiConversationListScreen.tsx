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
            <View style={[styles.header, { backgroundColor: colors.surface }]}>

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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
    },
    newChatButton: {
        backgroundColor: '#4F46E5',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    newChatButtonText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        marginTop: -3,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    itemContainer: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
    },
    textContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        flex: 1,
        marginRight: 10,
    },
    date: {
        fontSize: 12,
        fontWeight: '600',
    },
    messagePreview: {
        fontSize: 14,
        lineHeight: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
    },
    loadingIndicator: {
        marginTop: 40,
    },
    createButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 999,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 15,
    }
});

export default AiConversationListScreen;
