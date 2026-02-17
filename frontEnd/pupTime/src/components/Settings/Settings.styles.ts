import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createSettingsStyles = (colors: AppColors) =>
  StyleSheet.create({
    sectionWrapper: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: 8,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.secondaryText,
      marginBottom: 6,
      marginLeft: 4,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    sectionHeader: {
      marginBottom: 8,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    itemRowFirst: {
      borderTopWidth: 0,
    },
    itemLeft: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
    },
    itemIcon: {
      fontSize: 18,
      marginRight: 10,
    },
    itemLabel: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "500",
      flexShrink: 1,
    },
    itemValueContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    itemValue: {
      fontSize: 14,
      color: colors.secondaryText,
      marginRight: 6,
    },
    arrowIcon: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    selectChevron: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    switchThumbColor: {
      // placeholder, Switch uses inline colors
    },
    logoutButton: {
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 32,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonDanger ?? colors.error,
    },
    logoutText: {
      color: colors.primaryText,
      fontSize: 16,
      fontWeight: "600",
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.background,
      marginLeft: 8,
    },
    badgeText: {
      fontSize: 11,
      color: colors.secondaryText,
      fontWeight: "500",
    },
  });

export default createSettingsStyles;
