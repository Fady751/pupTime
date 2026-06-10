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
    heroEmojiLarge: {
      fontSize: 32,
      marginLeft: 14,
      marginRight: 12,
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
      marginBottom: 16,
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

    /* ── Detail Row ────────────────────────────── */
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    detailRowLast: {
      borderBottomWidth: 0,
    },
    detailIcon: {
      fontSize: 16,
      marginRight: 10,
      width: 24,
      textAlign: 'center',
    },
    detailLabel: {
      flex: 1,
      fontSize: 14,
      color: colors.secondaryText,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      maxWidth: '50%',
      textAlign: 'right',
    },

    /* ── Priority Badge ────────────────────────── */
    priorityBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 8,
    },
    priorityBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFF',
    },

    /* ── Actions ───────────────────────────────── */
    actionsContainer: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
    },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    addBtnDisabled: {
      opacity: 0.6,
    },
    addBtnText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '800',
    },
    editBtn: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#F59E0B',
    },
    editBtnText: {
      color: '#F59E0B',
      fontSize: 16,
      fontWeight: '700',
    },

    /* ── Loading ───────────────────────────────── */
    loadingCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.secondaryText,
    },
  });

export default createStyles;
