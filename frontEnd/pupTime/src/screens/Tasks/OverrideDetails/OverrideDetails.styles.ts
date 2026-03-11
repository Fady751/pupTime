import { StyleSheet, Dimensions } from "react-native";
import { AppColors } from "../../../constants/colors";

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

        /* ── Current Status Banner ──────────────────── */
        statusBanner: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 16,
            borderRadius: 16,
            marginHorizontal: 16,
            marginBottom: 14,
            gap: 10,
        },
        statusBannerText: {
            fontSize: 18,
            fontWeight: "800",
            color: "#FFFFFF",
        },
        statusBannerLock: {
            fontSize: 14,
            color: "rgba(255,255,255,0.8)",
        },

        /* ── Status Chips ───────────────────────────── */
        statusChipsTitle: {
            fontSize: 13,
            fontWeight: "700",
            color: colors.secondaryText,
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: 0.8,
        },
        statusChipsRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },
        statusChip: {
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: colors.border,
            backgroundColor: colors.background,
            minWidth: 100,
            alignItems: "center",
        },
        statusChipActive: {
            borderWidth: 2,
        },
        statusChipDisabled: {
            opacity: 0.4,
        },
        statusChipLabel: {
            fontSize: 13,
            fontWeight: "700",
            color: colors.secondaryText,
        },
        statusChipLabelActive: {
            color: "#FFFFFF",
        },

        /* ── Reschedule Date Picker ──────────────────── */
        rescheduleContainer: {
            marginTop: 16,
            backgroundColor: colors.background,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1.5,
            borderColor: colors.primary + "40",
        },
        rescheduleTitle: {
            fontSize: 13,
            fontWeight: "700",
            color: colors.primary,
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: 0.8,
        },
        rescheduleDateRow: {
            flexDirection: "row",
            gap: 10,
        },
        rescheduleDateBtn: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surface,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.border,
        },
        rescheduleDateIcon: {
            fontSize: 18,
            marginRight: 8,
        },
        rescheduleDateLabel: {
            fontSize: 11,
            color: colors.secondaryText,
            fontWeight: "500",
            marginBottom: 2,
        },
        rescheduleDateText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: "600",
        },

        /* ── Save Button ────────────────────────────── */
        saveContainer: {
            marginHorizontal: 16,
            marginTop: 6,
            marginBottom: 20,
        },
        saveBtn: {
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
        saveBtnDisabled: {
            opacity: 0.6,
        },
        saveBtnText: {
            color: "#FFFFFF",
            fontWeight: "700",
            fontSize: 16,
        },

        /* ── Locked Banner ──────────────────────────── */
        lockedBanner: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            paddingHorizontal: 20,
            backgroundColor: colors.surface,
            borderRadius: 14,
            marginHorizontal: 16,
            marginBottom: 14,
            borderWidth: 1.5,
            borderColor: "#8B5CF6" + "40",
        },
        lockedBannerIcon: {
            fontSize: 18,
        },
        lockedBannerText: {
            fontSize: 13,
            fontWeight: "600",
            color: colors.secondaryText,
            flex: 1,
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
