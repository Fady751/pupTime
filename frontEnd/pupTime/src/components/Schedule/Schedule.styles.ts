import { StyleSheet, Dimensions } from "react-native";
import type { AppColors } from "../../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const calcDaySize = (w: number, compact: boolean) => {
  const padding = compact ? 32 : 40;
  const gap = compact ? 16 : 8;
  return (w - padding - gap) / 7;
};

export const createScheduleStyles = (colors: AppColors, compact = false, containerWidth?: number) => {
  const w = containerWidth || SCREEN_WIDTH;
  const ds = calcDaySize(w, compact);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
      backgroundColor: colors.background,
      borderBottomWidth: 0,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 24,
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    navButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    navButtonText: {
      fontSize: 20,
      color: colors.text,
      fontWeight: "600",
    },
    monthYearContainer: {
      alignItems: "center",
      paddingHorizontal: 16,
    },
    monthText: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    yearText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
      marginTop: 2,
    },
    weekDays: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      marginBottom: 12,
    },
    weekDayText: {
      width: ds,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "700",
      color: colors.secondaryText,
    },
    calendarGrid: {
      paddingHorizontal: 10,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    dayCell: {
      width: ds,
      height: ds + 12,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: "transparent",
    },
    dayCellToday: {
      backgroundColor: colors.primaryLight,
    },
    dayCellSelected: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    dayCellOtherMonth: {
      opacity: 0.3,
    },
    dayNumber: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    dayNumberToday: {
      color: colors.primaryDark,
      fontWeight: "800",
    },
    dayNumberSelected: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 40,
    },
    taskIndicators: {
      flexDirection: "row",
      marginTop: 6,
      height: 6,
      gap: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    taskDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    content: {
      flex: 1,
      paddingTop: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.secondaryText,
    },
    taskCount: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
    },
    taskCountText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.primaryDark,
    },
    tasksList: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyEmoji: {
      fontSize: 54,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 15,
      color: colors.secondaryText,
      textAlign: "center",
      lineHeight: 22,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingTop: 12,
      paddingBottom: 40,
      maxHeight: "85%",
    },
    modalHandle: {
      width: 40,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 20,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    modalCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    modalCloseText: {
      fontSize: 20,
      color: colors.secondaryText,
    },
    modalScroll: {
      paddingHorizontal: 24,
    },
    monthPickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    monthPickerContent: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 32,
      padding: 24,
      maxHeight: "75%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
    },
    monthPickerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 24,
    },
    yearNavRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
      paddingHorizontal: 10,
    },
    yearNavButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    yearNavText: {
      fontSize: 20,
      color: colors.text,
    },
    yearNavTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
    },
    monthsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    monthPickerItem: {
      width: "31%",
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      marginBottom: 12,
      backgroundColor: colors.background,
    },
    monthPickerItemSelected: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    monthPickerItemCurrent: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    monthPickerItemText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    monthPickerItemTextSelected: {
      color: "#FFFFFF",
    },
    monthPickerItemTextCurrent: {
      color: colors.primary,
    },
    monthPickerClose: {
      marginTop: 20,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: colors.background,
      alignItems: "center",
    },
    monthPickerCloseText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    swipeHint: {
      position: "absolute",
      top: "50%",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    },
    swipeHintLeft: {
      left: 8,
    },
    swipeHintRight: {
      right: 8,
    },
    swipeHintText: {
      fontSize: 24,
      color: colors.secondaryText,
    },

    /* ── Task row with complete toggle ── */
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    taskRowCard: {
      flex: 1,
    },
    completeToggle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 12,
    },
    completeToggleDone: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    completeToggleDisabled: {
      opacity: 0.5,
    },
    completeToggleText: {
      fontSize: 20,
      fontWeight: "900",
      color: "#FFFFFF",
    },
  });
};

export const PRIORITY_COLORS = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
  none: "#9CA3AF",
};

export default createScheduleStyles;
