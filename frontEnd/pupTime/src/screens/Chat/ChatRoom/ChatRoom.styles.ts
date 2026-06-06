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
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingTop: Platform.OS === 'ios' ? 60 : 16,
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 4,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    backIcon: {
      fontSize: 22,
      color: colors.text,
      fontWeight: '800',
    },
    headerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    headerAvatarText: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.primaryDark,
    },
    headerInfo: {
      flex: 1,
    },
    headerName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    headerStatus: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    headerStatusOnline: {
      color: '#10b981',
    },
    headerStatusOffline: {
      color: colors.secondaryText,
    },

    /* ──── connection banner ──── */
    connectionBanner: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 12,
      borderRadius: 16,
    },
    connectionBannerConnecting: {
      backgroundColor: '#f59e0b22',
    },
    connectionBannerOffline: {
      backgroundColor: '#ef444422',
    },
    connectionBannerText: {
      fontSize: 13,
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
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    loadMoreContainer: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    loadMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
      gap: 8,
    },
    loadMoreText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.secondaryText,
    },

    /* ──── message bubbles ──── */
    messageRow: {
      marginBottom: 10,
      maxWidth: '85%',
    },
    messageRowMine: {
      alignSelf: 'flex-end',
    },
    messageRowTheirs: {
      alignSelf: 'flex-start',
    },
    senderName: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      marginBottom: 4,
      marginLeft: 10,
    },
    bubble: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 24,
    },
    bubbleMine: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 6,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 3,
    },
    bubbleTheirs: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    bubbleText: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
    },
    bubbleTextMine: {
      color: '#FFFFFF',
    },
    bubbleTextTheirs: {
      color: colors.text,
    },
    bubbleTime: {
      fontSize: 11,
      marginTop: 6,
      alignSelf: 'flex-end',
      fontWeight: '600',
    },
    bubbleTimeMine: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    bubbleTimeTheirs: {
      color: colors.secondaryText,
    },

    /* ──── date separator ──── */
    dateSeparator: {
      alignSelf: 'center',
      paddingHorizontal: 18,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surface,
      marginVertical: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    dateSeparatorText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
    },

    /* ──── input bar ──── */
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 6,
    },
    textInput: {
      flex: 1,
      minHeight: 48,
      maxHeight: 120,
      borderRadius: 24,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 14 : 12,
      paddingBottom: Platform.OS === 'ios' ? 14 : 12,
      fontSize: 15,
      color: colors.text,
      marginRight: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 1,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 3,
    },
    sendButtonDisabled: {
      backgroundColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    sendIcon: {
      fontSize: 20,
      color: '#FFFFFF',
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
      fontSize: 64,
      marginBottom: 16,
    },
    emptyChatTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyChatSubtitle: {
      fontSize: 15,
      color: colors.secondaryText,
      textAlign: 'center',
      lineHeight: 22,
      fontWeight: '500',
    },
  });

export default createChatRoomStyles;
