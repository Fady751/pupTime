import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createFriendsListStyles = (colors: AppColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.text,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerActionButton: {
      marginLeft: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerActionText: {
      fontSize: 12,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    listContainer: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.secondaryText,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    emptyState: {
      paddingHorizontal: 20,
      paddingTop: 40,
      alignItems: "center",
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: "center",
    },
  });

export default createFriendsListStyles;
