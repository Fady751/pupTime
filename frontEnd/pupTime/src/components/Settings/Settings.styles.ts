import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createSettingsStyles = (colors: AppColors) =>
  StyleSheet.create({
    sectionWrapper: {
      marginHorizontal: 20,
      marginBottom: 20,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingVertical: 10,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.primary,
      marginBottom: 8,
      marginLeft: 4,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    sectionHeader: {
      marginBottom: 8,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.divider + '33',
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
      fontSize: 20,
      marginRight: 12,
      backgroundColor: colors.background,
      padding: 8,
      borderRadius: 12,
      overflow: 'hidden',
    },
    itemLabel: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "700",
      flexShrink: 1,
    },
    itemValueContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    itemValue: {
      fontSize: 14,
      color: colors.secondaryText,
      marginRight: 8,
      fontWeight: "600",
    },
    arrowIcon: {
      fontSize: 18,
      color: colors.secondaryText,
    },
    selectChevron: {
      fontSize: 18,
      color: colors.secondaryText,
    },
    switchThumbColor: {
      // placeholder, Switch uses inline colors
    },
    logoutButton: {
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 40,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.error,
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
    logoutText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.background,
      marginLeft: 10,
    },
    badgeText: {
      fontSize: 12,
      color: colors.secondaryText,
      fontWeight: "700",
    },
  });

export default createSettingsStyles;
