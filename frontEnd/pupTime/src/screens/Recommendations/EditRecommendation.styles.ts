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
      fontSize: 22,
      fontWeight: '800',
      color: '#FFF',
    },
    heroSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },

    /* ── Content ────────────────────────────────── */
    scrollContent: {
      paddingTop: 20,
      paddingBottom: 60,
    },

    /* ── Section Card ──────────────────────────── */
    sectionCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 20,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    sectionIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },

    /* ── Emoji Picker ──────────────────────────── */
    emojiPickerContainer: {
      alignItems: 'center',
    },
    emojiPickerHelpText: {
      fontSize: 13,
      color: colors.secondaryText,
      textAlign: 'center',
      marginBottom: 12,
    },
    emojiInputWrapper: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emojiTextInput: {
      fontSize: 40,
      textAlign: 'center',
      color: colors.text,
      padding: 0,
      margin: 0,
      width: 70,
      height: 70,
    },
    clearEmojiButton: {
      marginTop: 4,
    },
    clearEmojiButtonText: {
      fontSize: 13,
      color: colors.error,
      fontWeight: '600',
    },

    /* ── Title Input ───────────────────────────── */
    titleInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
    },
    titleEmoji: {
      fontSize: 20,
      marginRight: 8,
    },
    titleInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 14,
    },

    /* ── Priority ──────────────────────────────── */
    priorityRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    priorityChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    priorityChipSelected: {
      borderWidth: 2,
    },
    priorityChipText: {
      fontSize: 14,
      fontWeight: '600',
    },

    /* ── Date / Time ───────────────────────────── */
    dateTimeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateTimeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    dateTimeIcon: {
      fontSize: 18,
    },
    dateTimeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dateTimeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginTop: 2,
    },

    /* ── Duration ──────────────────────────────── */
    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
    },
    durationIcon: {
      fontSize: 18,
      marginRight: 10,
    },
    durationInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 14,
    },
    durationUnit: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.secondaryText,
      marginLeft: 8,
    },

    /* ── Save Button ───────────────────────────── */
    actionsContainer: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    saveText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '800',
    },
  });

export default createStyles;
