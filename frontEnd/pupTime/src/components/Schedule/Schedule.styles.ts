import { StyleSheet, Dimensions } from "react-native";
import type { AppColors } from "../../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAY_SIZE = (SCREEN_WIDTH - 48 - 24) / 7; // 48 padding, 24 gap

export const createScheduleStyles = (colors: AppColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 20,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonText: {
    fontSize: 20,
    color: colors.text,
  },
  monthYearContainer: {
    alignItems: "center",
  },
  monthText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  yearText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.secondaryText,
    marginTop: 2,
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  weekDayText: {
    width: DAY_SIZE,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondaryText,
    textTransform: "uppercase",
  },
  calendarGrid: {
    paddingHorizontal: 12,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE + 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
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
    fontSize: 15,
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
    marginTop: 4,
    height: 6,
    gap: 2,
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
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
});

export const PRIORITY_COLORS = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
  none: "#9CA3AF",
};

export default createScheduleStyles;
