import { StyleSheet } from "react-native";
import { AppColors } from "../../constants/colors";

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },

    /* ── HEADER ─────────────────────────────────── */
    header: {
      height: 140,
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      color: "#FFFFFF",
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: -0.5,
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

    /* ── USER CARD ──────────────────────────────── */
    userCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginTop: -40,
      borderRadius: 24,
      alignItems: "center",
      padding: 25,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 8,
    },
    avatarWrapper: {
      marginBottom: 10,
    },
    avatarRing: {
      width: 94,
      height: 94,
      borderRadius: 47,
      borderWidth: 3,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.border,
    },
    onlineDot: {
      position: "absolute",
      bottom: 5,
      right: 5,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "#22C55E",
      borderWidth: 3,
      borderColor: colors.surface,
    },
    name: {
      fontSize: 22,
      fontWeight: "700",
      marginTop: 10,
      color: colors.text,
    },
    email: {
      color: colors.secondaryText,
      fontSize: 14,
      marginBottom: 15,
      marginTop: 2,
    },
    editBtn: {
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editTxt: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 14,
    },

    /* ── STATS ──────────────────────────────────── */
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginTop: 20,
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    statNum: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 4,
      fontWeight: "500",
    },

    /* ── SCHEDULE ───────────────────────────────── */
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginLeft: 20,
      marginTop: 25,
      marginBottom: 12,
      color: colors.text,
    },
    scheduleCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      borderRadius: 22,
      padding: 18,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    sessionRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    time: {
      width: 65,
      color: colors.secondaryText,
      fontWeight: "600",
      fontSize: 13,
    },
    sessionBlock: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      justifyContent: "center",
      paddingLeft: 15,
    },
    sessionText: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 14,
    },
    emptySchedule: {
      alignItems: "center",
      paddingVertical: 20,
    },
    emptyEmoji: {
      fontSize: 36,
      marginBottom: 8,
    },
    emptyText: {
      color: colors.secondaryText,
      fontSize: 14,
      textAlign: "center",
    },
  });

export default createStyles;