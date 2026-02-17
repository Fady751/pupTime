import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createFriendsStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    avatarText: {
      fontSize: 18,
    },
    name: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "500",
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
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    menuText: {
      fontSize: 18,
      color: colors.secondaryText,
    },
    primaryButton: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    primaryButtonDisabled: {
      backgroundColor: colors.divider,
    },
    primaryButtonText: {
      color: colors.primaryText,
      fontWeight: "600",
      fontSize: 13,
    },
    dangerButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.buttonDanger ?? colors.error,
    },
    dangerButtonText: {
      color: colors.primaryText,
      fontWeight: "600",
      fontSize: 13,
    },
  });

export default createFriendsStyles;
