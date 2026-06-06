import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createFriendsStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 24,
      backgroundColor: colors.surface,
      marginBottom: 12,
    },
    rowBorder: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.primaryDark,
    },
    name: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "800",
    },
    status: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
      fontWeight: "600",
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
    },
    menuButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.background,
    },
    menuText: {
      fontSize: 18,
      color: colors.secondaryText,
      fontWeight: "900",
    },
    primaryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
      minWidth: 84,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 3,
    },
    primaryButtonDisabled: {
      backgroundColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 13,
    },
    dangerButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.error,
      minWidth: 84,
      alignItems: "center",
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 3,
    },
    dangerButtonText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 13,
    },
  });

export default createFriendsStyles;
