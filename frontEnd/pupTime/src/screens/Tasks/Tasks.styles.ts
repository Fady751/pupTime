import { StyleSheet, Dimensions } from "react-native";
import { AppColors } from "../../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    /* ── Layout ─────────────────────────────────── */
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 100,
    },

    /* ── Hero Header ────────────────────────────── */
    heroContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: colors.primaryLight,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.primaryDark,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: 15,
      color: colors.primaryDark,
      opacity: 0.8,
      marginTop: 4,
      fontWeight: "500",
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.8)",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    backBtnText: {
      fontSize: 22,
      color: colors.primaryDark,
    },

    /* ── Stats Row ──────────────────────────────── */
    statsRow: {
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.6)",
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statDivider: {
      width: 1,
      backgroundColor: "rgba(0,0,0,0.05)",
    },
    statValue: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.primaryDark,
    },
    statLabel: {
      fontSize: 12,
      color: colors.primaryDark,
      opacity: 0.7,
      marginTop: 2,
      fontWeight: "600",
    },

    /* ── Date Selector ──────────────────────────── */
    dateSelector: {
      marginTop: -24,
      marginHorizontal: 20,
      zIndex: 10,
    },
    dateSelectorCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingVertical: 16,
      paddingHorizontal: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 6,
    },
    dateNavBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    dateNavBtnText: {
      fontSize: 20,
      color: colors.text,
      fontWeight: "700",
    },
    dateLabelContainer: {
      flex: 1,
      alignItems: "center",
    },
    dateLabelDay: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    dateLabelFull: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
      fontWeight: "500",
    },
    todayBadge: {
      marginTop: 6,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    todayBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },

    /* ── Filter Tabs ────────────────────────────── */
    filterTabsContainer: {
      marginTop: 24,
      marginHorizontal: 20,
    },
    filterTabs: {
      flexDirection: "row",
      gap: 10,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "transparent",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    filterTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    filterTabText: {
      color: colors.secondaryText,
      fontSize: 14,
      fontWeight: "700",
    },
    filterTabTextActive: {
      color: "#FFFFFF",
    },

    /* ── Task List Section ─────────────────────── */
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    sectionCount: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.secondaryText,
    },

    /* ── Task Card ──────────────────────────────── */
    taskCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
      borderLeftWidth: 0,
    },
    taskEmoji: {
      fontSize: 28,
      marginRight: 16,
      backgroundColor: colors.background,
      padding: 10,
      borderRadius: 16,
      overflow: "hidden",
    },
    taskContent: {
      flex: 1,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    taskTitleDone: {
      textDecorationLine: "line-through",
      color: colors.secondaryText,
    },
    taskMeta: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.secondaryText,
    },
    taskDuration: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.secondaryText,
      marginTop: 4,
    },

    /* ── Status Button ──────────────────────────── */
    statusBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 12,
      backgroundColor: "transparent",
    },
    statusBtnPending: {
    },
    statusBtnCompleted: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    statusBtnSkipped: {
      backgroundColor: colors.secondaryText,
      borderColor: colors.secondaryText,
    },
    statusBtnDisabled: {
      opacity: 0.5,
    },
    statusBtnText: {
      fontSize: 16,
      fontWeight: "900",
      color: "transparent",
    },
    statusBtnTextPending: {
    },
    statusBtnTextCompleted: {
      color: "#FFFFFF",
    },
    statusBtnTextSkipped: {
      color: "#FFFFFF",
    },

    /* ── Swipe Delete ───────────────────────────── */
    deleteBox: {
      backgroundColor: colors.error,
      justifyContent: "center",
      alignItems: "center",
      width: 100,
      marginBottom: 12,
      borderRadius: 24,
      marginLeft: 12,
    },
    deleteText: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 14,
    },
    deleteIcon: {
      fontSize: 24,
      marginBottom: 4,
    },

    /* ── Empty State ────────────────────────────── */
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      paddingVertical: 48,
      paddingHorizontal: 32,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 3,
    },
    emptyEmoji: {
      fontSize: 64,
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
    },
    emptySubtitle: {
      fontSize: 15,
      color: colors.secondaryText,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    emptyAction: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 28,
    },
    emptyActionText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 15,
    },

    /* ── FAB ─────────────────────────────────────── */
    fab: {
      position: "absolute",
      bottom: 100,
      right: 20,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    fabText: {
      color: "#FFFFFF",
      fontSize: 32,
      fontWeight: "600",
      marginTop: -2,
    },

    /* ── Bottom Spacer ──────────────────────────── */
    bottomSpacer: {
      height: 80,
    },

    /* ── Loading ─────────────────────────────────── */
    loadingContainer: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 40,
      alignItems: "center",
    },
  });

export default createStyles;