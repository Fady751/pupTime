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
        scrollContent: {
            paddingBottom: 40,
            paddingTop: 16,
        },

        /* ── Hero Header ────────────────────────────── */
        heroContainer: {
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 22,
            backgroundColor: colors.primary,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
        },
        heroTopRow: {
            flexDirection: "row",
            alignItems: "center",
        },
        heroEmojiLarge: {
            fontSize: 40,
            marginRight: 14,
        },
        heroTitle: {
            fontSize: 22,
            fontWeight: "800",
            color: "#FFFFFF",
            letterSpacing: -0.5,
        },
        heroSubtitle: {
            fontSize: 13,
            color: "rgba(255,255,255,0.7)",
            marginTop: 3,
            maxWidth: 240,
        },
        backBtn: {
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
        },
        backBtnText: {
            fontSize: 20,
            color: "#FFFFFF",
        },

        /* ── Section Card ───────────────────────────── */
        sectionCard: {
            backgroundColor: colors.surface,
            marginHorizontal: 16,
            marginBottom: 14,
            borderRadius: 20,
            padding: 18,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
        },
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
        },
        sectionIcon: {
            fontSize: 16,
            marginRight: 8,
        },
        sectionLabel: {
            fontSize: 12,
            fontWeight: "700",
            color: colors.secondaryText,
            textTransform: "uppercase",
            letterSpacing: 0.8,
        },

        /* ── Detail Row ─────────────────────────────── */
        detailRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border + "30",
        },
        detailRowLast: {
            borderBottomWidth: 0,
        },
        detailIcon: {
            fontSize: 18,
            marginRight: 12,
            width: 28,
            textAlign: "center",
        },
        detailLabel: {
            fontSize: 13,
            fontWeight: "600",
            color: colors.secondaryText,
            width: 100,
        },
        detailValue: {
            fontSize: 14,
            fontWeight: "600",
            color: colors.text,
            flex: 1,
        },

        /* ── Priority Badge ─────────────────────────── */
        priorityBadge: {
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 8,
        },
        priorityBadgeText: {
            fontSize: 12,
            fontWeight: "700",
            color: "#FFFFFF",
        },

        /* ── Categories ──────────────────────────────── */
        categoriesRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 4,
        },
        categoryChip: {
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: colors.primary + "18",
        },
        categoryChipText: {
            fontSize: 12,
            fontWeight: "600",
            color: colors.primary,
        },

        /* ── Schedule Section ────────────────────────── */
        scheduleCard: {
            backgroundColor: colors.surface,
            marginHorizontal: 16,
            marginBottom: 14,
            borderRadius: 20,
            padding: 18,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
        },
        viewOverridesBtn: {
            marginTop: 14,
            backgroundColor: colors.primary,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
        },
        viewOverridesBtnText: {
            color: "#FFFFFF",
            fontWeight: "700",
            fontSize: 14,
        },


        /* ── Action Buttons ──────────────────────────── */
        actionsContainer: {
            marginHorizontal: 16,
            marginTop: 6,
            marginBottom: 20,
            gap: 10,
        },
        editBtn: {
            backgroundColor: colors.primary,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
        },
        editBtnText: {
            color: "#FFFFFF",
            fontWeight: "700",
            fontSize: 16,
        },
        deleteBtn: {
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: colors.error,
            backgroundColor: "transparent",
        },
        deleteBtnText: {
            color: colors.error,
            fontWeight: "700",
            fontSize: 15,
        },

        /* ── Loading ─────────────────────────────────── */
        loadingCenter: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
        },
        loadingText: {
            color: colors.secondaryText,
            fontSize: 14,
        },
    });
