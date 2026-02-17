import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createTimerScreenStyles = (colors: AppColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    topBarLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    topIconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    topIconText: {
      fontSize: 18,
    },
    streakPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    streakPillText: {
      marginLeft: 6,
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    content: {
      flex: 1,
      paddingBottom: 24,
    },
    center: {
      alignItems: "center",
      justifyContent: "flex-start",
      marginTop: 8,
    },
    countdownWrapper: {
      marginTop: 8,
    },
    countdownText: {
      color: colors.text,
    },
    durationsRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 16,
      gap: 8,
    },
    durationChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    durationChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    durationChipText: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    durationChipTextActive: {
      color: colors.primaryText,
    },
    bottomSection: {
      marginTop: 16,
      paddingHorizontal: 20,
      alignItems: "center",
    },
    statusText: {
      marginTop: 12,
      fontSize: 13,
      color: colors.secondaryText,
      textAlign: "center",
    },
    successBanner: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: "#DCFCE7",
      alignItems: "center",
    },
    successTextPrimary: {
      fontSize: 14,
      fontWeight: "700",
      color: "#166534",
    },
    successTextSecondary: {
      marginTop: 4,
      fontSize: 13,
      color: "#166534",
    },
  });

export default createTimerScreenStyles;
