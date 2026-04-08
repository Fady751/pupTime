import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AppColors } from '../../constants/colors';

type SocketState = 'connected' | 'connecting' | 'disconnected';

type MessageInputProps = {
  colors: AppColors;
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  socketState: SocketState;
};

const MessageInput: React.FC<MessageInputProps> = ({
  colors,
  value,
  onChangeText,
  onSend,
  disabled,
  socketState,
}) => {
  const styles = createStyles(colors);
  const statusDotStyle =
    socketState === 'connected'
      ? styles.statusDotConnected
      : socketState === 'connecting'
        ? styles.statusDotConnecting
        : styles.statusDotDisconnected;

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, statusDotStyle]} />
        <Text style={styles.statusText}>
          {socketState === 'connected'
            ? 'Connected'
            : socketState === 'connecting'
              ? 'Connecting...'
              : 'Disconnected'}
        </Text>
      </View>

      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholder="Write a message"
          placeholderTextColor={colors.secondaryText}
          multiline
          editable={!disabled}
        />

        <Pressable
          onPress={onSend}
          disabled={disabled || !value.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            (disabled || !value.trim()) && styles.sendButtonDisabled,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(148, 163, 184, 0.28)',
      paddingTop: 10,
      paddingBottom: 8,
      paddingHorizontal: 2,
      backgroundColor: colors.surface,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      paddingHorizontal: 4,
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusDotConnected: {
      backgroundColor: '#22C55E',
    },
    statusDotConnecting: {
      backgroundColor: '#F59E0B',
    },
    statusDotDisconnected: {
      backgroundColor: '#94A3B8',
    },
    statusText: {
      fontSize: 12,
      color: colors.secondaryText,
      fontWeight: '600',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 46,
      maxHeight: 130,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    sendButton: {
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.22)',
      minWidth: 70,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      color: colors.primaryText,
      fontWeight: '800',
      fontSize: 13,
    },
  });

export default MessageInput;
