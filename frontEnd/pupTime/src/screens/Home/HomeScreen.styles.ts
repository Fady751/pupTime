import { StyleSheet, Dimensions } from "react-native";
import type { AppColors } from "../../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

export const createHomeStyles = (colors: AppColors) =>
  StyleSheet.create({
    // ========== LAYOUT ==========
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 100,
    },

    // ========== HERO HEADER ==========
    heroContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    heroGreeting: {
      flex: 1,
    },
    heroSubtitle: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
      marginBottom: 4,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: -0.5,
    },
    avatarContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.4)",
    },
    avatarText: {
      fontSize: 24,
    },
    avatarOnlineDot: {
      position: "absolute",
      bottom: 2,
      right: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#22C55E",
      borderWidth: 2,
      borderColor: colors.primary,
    },

    // ========== STATS ROW ==========
    statsRow: {
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 8,
      marginTop: 8,
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
      fontSize: 12,
      color: "rgba(255,255,255,0.8)",
      marginTop: 2,
    },

    chatSpotlightCard: {
      marginTop: 16,
      borderRadius: 22,
      backgroundColor: "rgba(99, 102, 241, 0.12)",
      padding: 18,
      overflow: "hidden",
      position: "relative",
      borderWidth: 1.5,
      borderColor: "rgba(255, 255, 255, 0.18)",
    },
    chatSpotlightOrb1: {
      position: "absolute",
      top: -30,
      right: -20,
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: "rgba(129, 140, 248, 0.35)",
    },
    chatSpotlightOrb2: {
      position: "absolute",
      bottom: -25,
      left: -15,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(16, 185, 129, 0.25)",
    },
    chatSpotlightTopRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      gap: 10,
    },
    chatSpotlightBadge: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    chatSpotlightBadgeIcon: {
      fontSize: 20,
    },
    chatSpotlightKickerPill: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.15)",
    },
    chatSpotlightKicker: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: "#FFFFFF",
    },
    chatSpotlightTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: "#FFFFFF",
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    chatSpotlightSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: "rgba(255, 255, 255, 0.75)",
      marginBottom: 16,
    },
    chatSpotlightBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    chatSpotlightMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
    },
    chatSpotlightDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#34D399",
      marginRight: 7,
      shadowColor: "#34D399",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 4,
      elevation: 2,
    },
    chatSpotlightMeta: {
      fontSize: 12,
      fontWeight: "700",
      color: "rgba(255, 255, 255, 0.7)",
      flex: 1,
    },
    chatSpotlightCTA: {
      backgroundColor: "#FFFFFF",
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 9,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    chatSpotlightCTAText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.primary,
      letterSpacing: 0.2,
    },

    // ========== QUICK ACTIONS ==========
    quickActionsContainer: {
      marginTop: -16,
      marginHorizontal: 20,
      zIndex: 10,
    },
    quickActionsCard: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 8,
    },
    quickActionItem: {
      flex: 1,
      alignItems: "center",
    },
    quickActionIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    quickActionEmoji: {
      fontSize: 24,
    },
    quickActionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },

    // ========== SECTION ==========
    section: {
      marginTop: 28,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    sectionAction: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.primary,
    },

    // ========== TODAY TASKS PREVIEW ==========
    taskPreviewCard: {
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
    taskPreviewEmoji: {
      fontSize: 24,
      marginRight: 12,
    },
    taskPreviewContent: {
      flex: 1,
    },
    taskPreviewTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    taskPreviewMeta: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    taskPreviewStatus: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    emptyTasksCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    emptyTasksEmoji: {
      fontSize: 40,
      marginBottom: 8,
    },
    emptyTasksText: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: "center",
    },

    // ========== FEATURE CARDS GRID ==========
    featureCardsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    featureCard: {
      width: CARD_WIDTH,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    featureCardIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    featureCardIcon: {
      fontSize: 24,
    },
    featureCardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    featureCardDesc: {
      fontSize: 12,
      color: colors.secondaryText,
      lineHeight: 16,
    },

    // ========== FOCUS BANNER ==========
    focusBanner: {
      marginHorizontal: 20,
      marginTop: 28,
      borderRadius: 20,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
    },
    focusBannerGradient: {
      backgroundColor: "#6366F1", // fallback, we layer it
    },
    focusBannerContent: {
      flex: 1,
    },
    focusBannerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#FFFFFF",
      marginBottom: 4,
    },
    focusBannerSubtitle: {
      fontSize: 13,
      color: "rgba(255,255,255,0.85)",
    },
    focusBannerButton: {
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
    },
    focusBannerButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#6366F1",
    },

    // ========== MOTIVATIONAL QUOTE ==========
    quoteCard: {
      marginHorizontal: 20,
      marginTop: 28,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    quoteIcon: {
      fontSize: 28,
      marginBottom: 8,
    },
    quoteText: {
      fontSize: 15,
      fontStyle: "italic",
      color: colors.text,
      lineHeight: 22,
      marginBottom: 8,
    },
    quoteAuthor: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: "500",
    },

    // ========== BOTTOM BAR SPACER ==========
    bottomSpacer: {
      height: 80,
    },
  });

export default createHomeStyles;
