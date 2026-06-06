import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createHomeStyles = (colors: AppColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    // ========== HEADER ==========
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
      marginBottom: 24,
    },
    headerGreeting: {
      fontSize: 14,
      color: colors.secondaryText,
      fontWeight: "500",
      marginBottom: 4,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerIcons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    iconText: {
      fontSize: 18,
    },
    pillButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FEF3C7", // light amber for streak
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
    },
    pillText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#D97706",
    },

    // ========== COMPANION CARD ==========
    companionCard: {
      marginHorizontal: 20,
      backgroundColor: colors.primaryLight,
      borderRadius: 28,
      padding: 24,
      marginBottom: 32,
    },
    companionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 12,
    },
    companionDogAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#FFF",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    dogAvatarText: {
      fontSize: 24,
    },
    companionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.primaryDark,
    },
    companionSubtitle: {
      fontSize: 13,
      color: colors.primaryDark,
      opacity: 0.8,
    },
    companionBodyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    companionMessage: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      color: colors.primaryDark,
      marginRight: 16,
      fontWeight: "500",
    },
    progressCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: "#FFF",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 4,
      borderColor: colors.primary,
    },
    progressText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.primaryDark,
    },
    progressLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primaryDark,
      opacity: 0.6,
    },
    chatButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
      paddingHorizontal: 20,
    },
    chatButtonText: {
      color: "#FFF",
      fontSize: 14,
      fontWeight: "700",
    },

    // ========== SECTION ==========
    section: {
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    sectionAction: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
    },

    // ========== TASKS ==========
    taskCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    taskCheckbox: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    taskCheckboxDone: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    taskCheckIcon: {
      color: "#FFF",
      fontSize: 16,
      fontWeight: "900",
    },
    taskInfo: {
      flex: 1,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    taskTitleDone: {
      textDecorationLine: "line-through",
      color: colors.secondaryText,
    },
    taskTime: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    taskDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: 12,
    },
    emptyTasksCard: {
      padding: 24,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 20,
    },
    emptyTasksText: {
      fontSize: 15,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    bottomSpacer: {
      height: 80,
    },
  });

export default createHomeStyles;
