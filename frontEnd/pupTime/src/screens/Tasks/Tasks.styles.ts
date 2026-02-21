import { StyleSheet } from "react-native";
import { AppColors } from "../../constants/colors";

export const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  header: {
    fontSize: 28,
    color: colors.text,
    fontWeight: "bold",
    marginBottom: 12,
  },

  /* ── Date filter ── */
  dateFilterBtn: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
  },

  dateFilterText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },

  /* ── Status filter tabs ── */
  filterTabs: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 8,
  },

  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    borderWidth: 1,
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
    color: colors.primaryText,
  },

  cardWrapper: {
    position: "relative",
  },

  taskCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  taskText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  completedText: {
    textDecorationLine: "line-through",
    color: colors.secondaryText,
  },

  completeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  completedBtn: {
    backgroundColor: "#22C55E",
  },

  disabledBtn: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },

  completeText: {
    color: colors.primaryText,
    fontWeight: "bold",
  },

  completeBtnContainer: {
    position: "absolute",
    top: 16,
    right: 16,
  },

  deleteBox: {
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    marginBottom: 12,
    borderRadius: 16,
  },

  deleteText: {
    color: "#FFF",
    fontWeight: "bold",
  },

  addButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 65,
    height: 65,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  addText: {
    color: colors.primaryText,
    fontSize: 30,
    marginTop: -2,
  },

  listContent: {
    paddingBottom: 100,
  },

  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },

  emptyCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  emptyEmoji: {
    fontSize: 38,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },

  emptyAction: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  emptyActionText: {
    color: colors.primaryText,
    fontWeight: "700",
    fontSize: 14,
  },
});

export default createStyles;