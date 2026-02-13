import { StyleSheet } from "react-native";
import { AppColors } from "../../../constants/colors";

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  listContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },

  /* HEADER */

  header: {
    alignItems: "center",
    marginBottom: 32,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.secondaryText,
    fontWeight: "500",
  },

  /* CATEGORY FILTER */

  categoryFilter: {
    marginBottom: 20,
    maxHeight: 44,
  },

  categoryFilterContent: {
    paddingHorizontal: 8,
    gap: 10,
  },

  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },

  categoryChipTextSelected: {
    color: colors.primaryText,
  },

  /* GRID */

  grid: {
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },

  /* EMPTY STATE */

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  emptyText: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: "center",
  },

  habitCard: {
    width: "47%",
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,

    borderWidth: 2,
    borderColor: colors.border,
  },

  habitCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,

    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  habitText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },

  habitTextSelected: {
    color: colors.primaryText,
  },

  categoryLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 4,
  },

  categoryLabelSelected: {
    color: colors.primaryText,
    opacity: 0.8,
  },

  /* FOOTER */

  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  nextButton: {
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",

    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  nextDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },

  nextText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default createStyles;
