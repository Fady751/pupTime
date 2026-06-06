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
      height: 180,
      backgroundColor: colors.primaryLight,
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
      justifyContent: "flex-start",
      paddingTop: 60,
      paddingHorizontal: 24,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      color: colors.primaryDark,
      fontSize: 32,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    iconBtn: {
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

    /* ── USER CARD ──────────────────────────────── */
    userCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginTop: -60,
      borderRadius: 32,
      alignItems: "center",
      padding: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 8,
    },
    avatarWrapper: {
      marginBottom: 16,
    },
    avatarRing: {
      width: 110,
      height: 110,
      borderRadius: 55,
      borderWidth: 4,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFFFFF",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.border,
    },
    onlineDot: {
      position: "absolute",
      bottom: 5,
      right: 5,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#22C55E",
      borderWidth: 3,
      borderColor: colors.surface,
    },
    name: {
      fontSize: 26,
      fontWeight: "800",
      marginTop: 8,
      color: colors.text,
    },
    email: {
      color: colors.secondaryText,
      fontSize: 15,
      marginBottom: 20,
      marginTop: 2,
      fontWeight: "500",
    },
    editBtn: {
      backgroundColor: colors.background,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.border,
    },
    editTxt: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 15,
    },

    /* ── STATS ──────────────────────────────────── */
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginTop: 24,
      gap: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingVertical: 20,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 4,
    },
    statNum: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.primary,
    },
    statLabel: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 4,
      fontWeight: "600",
    },

    /* ── SCHEDULE ───────────────────────────────── */
    sectionTitle: {
      fontSize: 22,
      fontWeight: "800",
      marginLeft: 24,
      marginTop: 32,
      marginBottom: 16,
      color: colors.text,
    },
    scheduleCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      borderRadius: 32,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 4,
    },
    sessionRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    time: {
      width: 70,
      color: colors.secondaryText,
      fontWeight: "700",
      fontSize: 14,
    },
    sessionBlock: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      justifyContent: "center",
      paddingLeft: 18,
    },
    sessionText: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 15,
    },
    emptySchedule: {
      alignItems: "center",
      paddingVertical: 32,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyText: {
      color: colors.secondaryText,
      fontSize: 15,
      textAlign: "center",
      fontWeight: "500",
    },
  });

export default createStyles;