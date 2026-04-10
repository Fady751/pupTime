import { StyleSheet, Platform } from 'react-native';
import type { AppColors } from '../../../constants/colors';

const createChatRoomStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    /* ──── header ──── */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'ios' ? 50 : 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider + '44',
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border + '55',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    backIcon: {
      fontSize: 18,
      color: colors.text,
      fontWeight: '700',
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
      borderWidth: 1.5,
      borderColor: 'rgba(37, 99, 235, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    headerAvatarText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary,
    },
    headerInfo: {
      flex: 1,
    },
    headerName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    headerStatus: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 1,
    },
    headerStatusOnline: {
      color: '#10b981',
    },
    headerStatusOffline: {
      color: colors.secondaryText,
    },

    /* ──── connection banner ──── */
    connectionBanner: {
      paddingVertical: 6,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    connectionBannerConnecting: {
      backgroundColor: '#f59e0b22',
    },
    connectionBannerOffline: {
      backgroundColor: '#ef444422',
    },
    connectionBannerText: {
      fontSize: 12,
      fontWeight: '700',
    },
    connectionBannerTextConnecting: {
      color: '#f59e0b',
    },
    connectionBannerTextOffline: {
      color: '#ef4444',
    },

    /* ──── messages list ──── */
    messagesList: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 10,
    },
    loadMoreContainer: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    loadMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border + '55',
      gap: 6,
    },
    loadMoreText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
    },

    /* ──── message bubbles ──── */
    messageRow: {
      marginBottom: 6,
      maxWidth: '80%',
    },
    messageRowMine: {
      alignSelf: 'flex-end',
    },
    messageRowTheirs: {
      alignSelf: 'flex-start',
    },
    senderName: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 3,
      marginLeft: 6,
    },
    bubble: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
    },
    bubbleMine: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 2,
    },
    bubbleTheirs: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border + '44',
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 5,
      elevation: 1,
    },
    bubbleText: {
      fontSize: 15,
      lineHeight: 21,
    },
    bubbleTextMine: {
      color: '#FFFFFF',
    },
    bubbleTextTheirs: {
      color: colors.text,
    },
    bubbleTime: {
      fontSize: 10,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    bubbleTimeMine: {
      color: 'rgba(255, 255, 255, 0.65)',
    },
    bubbleTimeTheirs: {
      color: colors.secondaryText,
    },

    /* ──── date separator ──── */
    dateSeparator: {
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border + '44',
      marginVertical: 10,
    },
    dateSeparatorText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.secondaryText,
    },

    /* ──── input bar ──── */
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.divider + '44',
    },
    textInput: {
      flex: 1,
      minHeight: 42,
      maxHeight: 110,
      borderRadius: 22,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border + '55',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 12 : 10,
      paddingBottom: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 15,
      color: colors.text,
      marginRight: 10,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.24)',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    sendButtonDisabled: {
      backgroundColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    sendIcon: {
      fontSize: 18,
      color: colors.primaryText,
      fontWeight: '800',
    },

    /* ──── empty chat ──── */
    emptyChatContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    emptyChatIcon: {
      fontSize: 50,
      marginBottom: 12,
    },
    emptyChatTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
      textAlign: 'center',
    },
    emptyChatSubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

export default createChatRoomStyles;
