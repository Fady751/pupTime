import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },

    /* ── Hero Header ────────────────────────────── */
    heroContainer: {
      backgroundColor: colors.primary,
      paddingTop: 16,
      paddingBottom: 28,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnText: {
      fontSize: 20,
      color: '#FFF',
      fontWeight: '700',
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFF',
      marginLeft: 14,
    },

    /* ── Content ────────────────────────────────── */
    scrollContent: {
      paddingTop: 20,
      paddingBottom: 60,
    },

    /* ── Task Card ──────────────────────────────── */
    taskCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    taskEmojiContainer: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    taskEmoji: {
      fontSize: 24,
    },
    taskInfo: {
      flex: 1,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    taskMeta: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: '500',
    },
    priorityDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: 12,
    },

    /* ── Loading / Empty / Error States ──────── */
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingTop: 80,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 15,
      color: colors.secondaryText,
      fontWeight: '500',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyMessage: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: 'center',
      lineHeight: 20,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.error,
      textAlign: 'center',
      marginBottom: 8,
    },
    retryBtn: {
      marginTop: 20,
      backgroundColor: colors.primary,
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: 14,
    },
    retryBtnText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 15,
    },

    /* ── Load More ───────────────────────────── */
    loadMoreBtn: {
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 20,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.primary,
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: 14,
    },
    loadMoreBtnText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 15,
    },
  });

export default createStyles;
