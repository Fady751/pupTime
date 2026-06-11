import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createBlockedListStyles = (colors: AppColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      position: "relative",
    },
    glowOrbTop: {
      position: "absolute",
      top: -100,
      right: -50,
      width: 250,
      height: 250,
      borderRadius: 999,
      backgroundColor: "rgba(244, 63, 94, 0.25)",
    },
    glowOrbBottom: {
      position: "absolute",
      bottom: -50,
      left: -80,
      width: 300,
      height: 300,
      borderRadius: 999,
      backgroundColor: "rgba(37, 99, 235, 0.20)",
    },
    header: {
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 20,
      paddingHorizontal: 24,
      paddingVertical: 24,
      borderRadius: 32,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 4,
    },
    kicker: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.error,
      marginBottom: 6,
    },
    title: {
      fontSize: 34,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 15,
      lineHeight: 22,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: 40,
    },
    listContainer: {
      paddingHorizontal: 20,
    },
    sectionCard: {
      borderRadius: 32,
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 3,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.secondaryText,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    sectionCount: {
      backgroundColor: colors.error,
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
      minWidth: 28,
      textAlign: "center",
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
    },
    loadingState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyState: {
      paddingHorizontal: 20,
      paddingTop: 60,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: "center",
      lineHeight: 24,
      fontWeight: "500",
    },
  });

export default createBlockedListStyles;
