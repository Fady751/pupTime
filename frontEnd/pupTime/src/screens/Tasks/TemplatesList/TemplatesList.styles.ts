import { StyleSheet, Dimensions } from "react-native";
import { AppColors } from "../../../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const createStyles = (colors: AppColors) =>
    StyleSheet.create({
        /* ── Layout ─────────────────────────────────── */
        safe: {
            flex: 1,
            backgroundColor: colors.background,
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

        /* ── Search Bar ─────────────────────────────── */
        searchContainer: {
            marginTop: -16,
            marginHorizontal: 20,
            zIndex: 10,
        },
        searchBar: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surface,
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 5,
        },
        searchIcon: {
            fontSize: 16,
            marginRight: 10,
        },
        searchInput: {
            flex: 1,
            fontSize: 15,
            color: colors.text,
            fontWeight: "500",
            padding: 0,
        },
        searchClear: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
        },
        searchClearText: {
            fontSize: 14,
            fontWeight: "700",
            color: colors.secondaryText,
        },

        /* ── Filter Chips ──────────────────────────── */
        filterContainer: {
            paddingHorizontal: 20,
            marginTop: 14,
        },
        filterRow: {
            flexDirection: "row",
            gap: 8,
        },
        filterChip: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.border,
        },
        filterChipActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        filterChipText: {
            fontSize: 13,
            fontWeight: "600",
            color: colors.secondaryText,
        },
        filterChipTextActive: {
            color: "#FFFFFF",
        },

        /* ── Template Card ─────────────────────────── */
        templateCard: {
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
        templateEmoji: {
            fontSize: 30,
            marginRight: 14,
        },
        templateContent: {
            flex: 1,
        },
        templateTitle: {
            fontSize: 16,
            fontWeight: "700",
            color: colors.text,
            marginBottom: 4,
        },
        templateMeta: {
            fontSize: 12,
            color: colors.secondaryText,
            marginBottom: 2,
        },
        templateSchedule: {
            fontSize: 11,
            color: colors.primary,
            fontWeight: "600",
            marginTop: 2,
        },
        templatePriorityBadge: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            alignSelf: "flex-start",
        },
        templatePriorityText: {
            fontSize: 11,
            fontWeight: "700",
            color: "#FFFFFF",
        },

        /* ── Quick Actions ─────────────────────────── */
        quickActionsRow: {
            flexDirection: "row",
            gap: 8,
            marginLeft: 8,
        },
        quickActionBtn: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
        },
        quickActionText: {
            fontSize: 16,
        },

        /* ── Swipe Delete ───────────────────────────── */
        deleteBox: {
            backgroundColor: colors.error,
            justifyContent: "center",
            alignItems: "center",
            width: 80,
            marginBottom: 10,
            borderRadius: 18,
        },
        deleteBoxText: {
            color: "#FFF",
            fontWeight: "bold",
            fontSize: 13,
        },
        deleteBoxIcon: {
            fontSize: 22,
            marginBottom: 2,
        },

        /* ── Section Header ────────────────────────── */
        section: {
            marginTop: 18,
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

        /* ── Empty State ───────────────────────────── */
        emptyCard: {
            backgroundColor: colors.surface,
            borderRadius: 22,
            paddingVertical: 48,
            paddingHorizontal: 28,
            alignItems: "center",
            marginHorizontal: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
        },
        emptyEmoji: {
            fontSize: 56,
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

        /* ── Loading ─────────────────────────────────── */
        loadingContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
        },
    });
