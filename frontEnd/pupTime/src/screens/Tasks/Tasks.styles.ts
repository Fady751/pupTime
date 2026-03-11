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
      paddingBottom: 24,
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: 13,
      color: "rgba(255,255,255,0.75)",
      marginTop: 2,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    backBtnText: {
      fontSize: 20,
      color: "#FFFFFF",
    },

    /* ── Stats Row ──────────────────────────────── */
    statsRow: {
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statDivider: {
      width: 1,
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    statValue: {
      fontSize: 22,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    statLabel: {
      fontSize: 11,
      color: "rgba(255,255,255,0.8)",
      marginTop: 2,
      fontWeight: "500",
    },

    /* ── Date Selector ──────────────────────────── */
    dateSelector: {
      marginTop: -18,
      marginHorizontal: 20,
      zIndex: 10,
    },
    dateSelectorCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 18,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 6,
    },
    dateNavBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    dateNavBtnText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "700",
    },
    dateLabelContainer: {
      flex: 1,
      alignItems: "center",
    },
    dateLabelDay: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    dateLabelFull: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 1,
    },
    todayBadge: {
      marginTop: 4,
      backgroundColor: colors.primary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    todayBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    /* ── Filter Tabs ────────────────────────────── */
    filterTabsContainer: {
      marginTop: 18,
      marginHorizontal: 20,
    },
    filterTabs: {
      flexDirection: "row",
      gap: 8,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.surface,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    filterTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterTabText: {
      color: colors.secondaryText,
      fontSize: 13,
      fontWeight: "600",
    },
    filterTabTextActive: {
      color: "#FFFFFF",
    },

    /* ── Task List Section ─────────────────────── */
    section: {
      marginTop: 20,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    sectionCount: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.secondaryText,
    },

    /* ── Task Card ──────────────────────────────── */
    taskCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
      borderLeftWidth: 4,
    },
    taskEmoji: {
      fontSize: 26,
      marginRight: 14,
    },
    taskContent: {
      flex: 1,
    },
    taskTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 3,
    },
    taskTitleDone: {
      textDecorationLine: "line-through",
      color: colors.secondaryText,
    },
    taskMeta: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    taskDuration: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 2,
    },

    /* ── Status Button ──────────────────────────── */
    statusBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      minWidth: 70,
      alignItems: "center",
    },
    statusBtnPending: {
      backgroundColor: "rgba(37,99,235,0.12)",
    },
    statusBtnCompleted: {
      backgroundColor: "rgba(34,197,94,0.12)",
    },
    statusBtnSkipped: {
      backgroundColor: "rgba(156,163,175,0.12)",
    },
    statusBtnDisabled: {
      backgroundColor: "rgba(156,163,175,0.08)",
      opacity: 0.5,
    },
    statusBtnText: {
      fontSize: 12,
      fontWeight: "700",
    },
    statusBtnTextPending: {
      color: colors.primary,
    },
    statusBtnTextCompleted: {
      color: "#22C55E",
    },
    statusBtnTextSkipped: {
      color: "#9CA3AF",
    },

    /* ── Swipe Delete ───────────────────────────── */
    deleteBox: {
      backgroundColor: colors.error,
      justifyContent: "center",
      alignItems: "center",
      width: 90,
      marginBottom: 10,
      borderRadius: 18,
    },
    deleteText: {
      color: "#FFF",
      fontWeight: "bold",
      fontSize: 13,
    },
    deleteIcon: {
      fontSize: 22,
      marginBottom: 2,
    },

    /* ── Empty State ────────────────────────────── */
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      paddingVertical: 40,
      paddingHorizontal: 28,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
    },
    emptyEmoji: {
      fontSize: 52,
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 22,
    },
    emptyAction: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    emptyActionText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 14,
    },

    /* ── FAB ─────────────────────────────────────── */
    fab: {
      position: "absolute",
      bottom: 90,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 10,
    },
    fabText: {
      color: "#FFFFFF",
      fontSize: 28,
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
      borderRadius: 18,
      padding: 40,
      alignItems: "center",
    },
  });

export default createStyles;