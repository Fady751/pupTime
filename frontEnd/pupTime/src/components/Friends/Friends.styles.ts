import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createFriendsStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 11,
      paddingHorizontal: 11,
      borderRadius: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    rowBorder: {
      shadowColor: "#111827",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(37, 99, 235, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(37, 99, 235, 0.24)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    avatarText: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.primary,
    },
    name: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "700",
    },
    status: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
    },
    menuButton: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    menuText: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    primaryButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.primary,
      minWidth: 74,
      alignItems: "center",
    },
    primaryButtonDisabled: {
      backgroundColor: colors.divider,
    },
    primaryButtonText: {
      color: colors.primaryText,
      fontWeight: "700",
      fontSize: 13,
    },
    dangerButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.buttonDanger ?? colors.error,
      minWidth: 74,
      alignItems: "center",
    },
    dangerButtonText: {
      color: colors.primaryText,
      fontWeight: "700",
      fontSize: 13,
    },
  });

export default createFriendsStyles;
