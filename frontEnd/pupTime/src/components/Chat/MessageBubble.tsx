import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/colors';

export type MessageViewModel = {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  isMine: boolean;
};

type MessageBubbleProps = {
  colors: AppColors;
  message: MessageViewModel;
  showSender: boolean;
};

const formatTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ colors, message, showSender }) => {
  const styles = createStyles(colors);

  return (
    <View style={[styles.wrapper, message.isMine ? styles.mineWrapper : styles.otherWrapper]}>
      <View
        style={[
          styles.bubble,
          message.isMine ? styles.mineBubble : styles.otherBubble,
        ]}
      >
        {showSender && !message.isMine && (
          <Text style={styles.senderText} numberOfLines={1}>
            {message.senderName}
          </Text>
        )}

        <Text style={[styles.contentText, message.isMine && styles.mineContentText]}>
          {message.content}
        </Text>

        <Text style={[styles.timeText, message.isMine && styles.mineTimeText]}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: 9,
      flexDirection: 'row',
    },
    mineWrapper: {
      justifyContent: 'flex-end',
    },
    otherWrapper: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '80%',
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingTop: 9,
      paddingBottom: 8,
      borderWidth: 1,
    },
    mineBubble: {
      borderColor: 'rgba(37, 99, 235, 0.6)',
      backgroundColor: colors.primary,
      borderBottomRightRadius: 6,
    },
    otherBubble: {
      borderColor: 'rgba(148, 163, 184, 0.3)',
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 6,
    },
    senderText: {
      color: '#0EA5E9',
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 4,
    },
    contentText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    mineContentText: {
      color: colors.primaryText,
    },
    timeText: {
      marginTop: 6,
      alignSelf: 'flex-end',
      color: colors.secondaryText,
      fontSize: 10,
      fontWeight: '600',
    },
    mineTimeText: {
      color: 'rgba(255, 255, 255, 0.85)',
    },
  });

export default MessageBubble;
