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
    heroSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginLeft: 14,
      marginTop: 2,
    },

    /* ── Content ────────────────────────────────── */
    scrollContent: {
      paddingBottom: 60,
      paddingTop: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginHorizontal: 20,
      marginBottom: 16,
    },

    /* ── Option Buttons ────────────────────────── */
    optionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginBottom: 16,
      padding: 22,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    optionIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    optionEmoji: {
      fontSize: 28,
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    optionDescription: {
      fontSize: 13,
      color: colors.secondaryText,
      lineHeight: 18,
    },
    optionArrow: {
      fontSize: 18,
      color: colors.secondaryText,
      marginLeft: 8,
    },
  });

export default createStyles;
