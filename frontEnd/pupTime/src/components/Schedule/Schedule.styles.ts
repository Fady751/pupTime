import { StyleSheet, Dimensions } from "react-native";
import type { AppColors } from "../../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const calcDaySize = (w: number, compact: boolean) => {
  const padding = compact ? 32 : 48;
  const gap = compact ? 16 : 24;
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
      paddingHorizontal: compact ? 14 : 24,
      paddingTop: compact ? 8 : 16,
      paddingBottom: compact ? 10 : 20,
      backgroundColor: colors.surface,
      borderBottomLeftRadius: compact ? 18 : 28,
      borderBottomRightRadius: compact ? 18 : 28,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    headerTitle: {
      fontSize: compact ? 18 : 28,
      fontWeight: "800",
      color: colors.text,
      marginBottom: compact ? 10 : 20,
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: compact ? 10 : 20,
    },
    navButton: {
      width: compact ? 32 : 44,
      height: compact ? 32 : 44,
      borderRadius: compact ? 10 : 14,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    navButtonText: {
      fontSize: compact ? 16 : 20,
      color: colors.text,
    },
    monthYearContainer: {
      alignItems: "center",
    },
    monthText: {
      fontSize: compact ? 16 : 22,
      fontWeight: "700",
      color: colors.text,
    },
    yearText: {
      fontSize: compact ? 11 : 14,
      fontWeight: "500",
      color: colors.secondaryText,
      marginTop: 2,
    },
    weekDays: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: compact ? 6 : 12,
      marginBottom: compact ? 4 : 8,
    },
    weekDayText: {
      width: ds,
      textAlign: "center",
      fontSize: compact ? 10 : 12,
      fontWeight: "600",
      color: colors.secondaryText,
      textTransform: "uppercase",
    },
    calendarGrid: {
      paddingHorizontal: compact ? 6 : 12,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: compact ? 4 : 8,
    },
    dayCell: {
      width: ds,
      height: ds + (compact ? 4 : 8),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: compact ? 10 : 14,
    },
    dayCellToday: {
      backgroundColor: "#E0E7FF",
    },
    dayCellSelected: {
      backgroundColor: colors.primary,
    },
    dayCellOtherMonth: {
      opacity: 0.3,
    },
    dayNumber: {
      fontSize: compact ? 12 : 15,
      fontWeight: "600",
      color: colors.text,
    },
    dayNumberToday: {
      color: colors.primary,
      fontWeight: "700",
    },
    dayNumberSelected: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    taskIndicators: {
      flexDirection: "row",
      marginTop: compact ? 2 : 4,
      height: compact ? 4 : 6,
      gap: 2,
    },
    taskDot: {
      width: compact ? 4 : 5,
      height: compact ? 4 : 5,
      borderRadius: compact ? 2 : 2.5,
    },
    content: {
      flex: 1,
      paddingTop: compact ? 10 : 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: compact ? 14 : 24,
      marginBottom: compact ? 8 : 16,
    },
    sectionTitle: {
      fontSize: compact ? 14 : 18,
      fontWeight: "700",
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: compact ? 11 : 13,
      color: colors.secondaryText,
    },
    taskCount: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    taskCountText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
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
      fontSize: 48,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: "center",
      lineHeight: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingBottom: 40,
      maxHeight: "85%",
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.divider,
      alignSelf: "center",
      marginBottom: 16,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#F3F4F6",
      alignItems: "center",
      justifyContent: "center",
    },
    modalCloseText: {
      fontSize: 18,
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
      paddingHorizontal: 24,
    },
    monthPickerContent: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      maxHeight: "70%",
    },
    monthPickerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 20,
    },
    yearNavRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    yearNavButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "#F3F4F6",
      alignItems: "center",
      justifyContent: "center",
    },
    yearNavText: {
      fontSize: 18,
      color: colors.text,
    },
    yearNavTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    monthsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    monthPickerItem: {
      width: "30%",
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      marginBottom: 12,
      backgroundColor: colors.background,
    },
    monthPickerItemSelected: {
      backgroundColor: colors.primary,
    },
    monthPickerItemCurrent: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    monthPickerItemText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    monthPickerItemTextSelected: {
      color: "#FFFFFF",
    },
    monthPickerItemTextCurrent: {
      color: colors.primary,
    },
    monthPickerClose: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.background,
      alignItems: "center",
    },
    monthPickerCloseText: {
      fontSize: 15,
      fontWeight: "600",
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
      color: "#D1D5DB",
    },

    /* ── Task row with complete toggle ── */
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 2,
    },
    taskRowCard: {
      flex: 1,
    },
    completeToggle: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.border + '60',
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 10,
    },
    completeToggleDone: {
      backgroundColor: "#22C55E",
      borderColor: "#22C55E",
      shadowColor: "#22C55E",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 3,
    },
    completeToggleDisabled: {
      opacity: 0.3,
    },
    completeToggleText: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.secondaryText,
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
