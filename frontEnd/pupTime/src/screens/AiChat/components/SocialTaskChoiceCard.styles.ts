import { StyleSheet } from 'react-native';
import { AppColors } from '../../../constants/colors';

const createSocialTaskChoiceCardStyles = (colors: AppColors) =>
  StyleSheet.create({
    // ── Outer wrapper ─────────────────────────────────────────
    card: {
      borderRadius: 20,
      overflow: 'hidden',
      marginVertical: 6,
      // Subtle shadow to lift the card
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1.5,
      borderColor: colors.primary + '55', // primary at 33% opacity
    },
    cardExecuted: {
      opacity: 0.6,
      borderColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },

    // ── Gradient-style header strip ───────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.primary,
      gap: 8,
    },
    headerIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flex: 1,
    },
    executedBadgeHeader: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    executedBadgeHeaderText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // ── Card body ─────────────────────────────────────────────
    body: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
    },

    // ── Title ─────────────────────────────────────────────────
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 10,
      lineHeight: 24,
    },

    // ── Pills row ─────────────────────────────────────────────
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      gap: 5,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryDark,
    },

    // ── Description ───────────────────────────────────────────
    description: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 20,
      marginBottom: 12,
    },

    // ── Sub-tasks section ─────────────────────────────────────
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 10,
    },
    subTasksLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    subTaskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 10,
    },
    subTaskDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      flexShrink: 0,
    },
    subTaskContent: {
      flex: 1,
    },
    subTaskTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    subTaskMeta: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 1,
    },
  });

export default createSocialTaskChoiceCardStyles;
