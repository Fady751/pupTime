import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const PRIORITY_COLORS = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
  none: "#9CA3AF",
} as const;

export const createTaskCardStyles = (colors: AppColors) =>
  StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  emojiContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  emoji: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  interestBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  interestText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 14,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: "45%",
    paddingVertical: 6,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusCompleted: {
    backgroundColor: "#D1FAE5",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotPending: {
    backgroundColor: "#F59E0B",
  },
  statusDotCompleted: {
    backgroundColor: "#10B981",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusTextPending: {
    color: "#92400E",
  },
  statusTextCompleted: {
    color: "#065F46",
  },
  repetitionContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 4,
  },
  repetitionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  repetitionText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.secondaryText,
    textTransform: "capitalize",
  },
  priorityHigh: {
    borderLeftColor: PRIORITY_COLORS.high,
  },
  priorityMedium: {
    borderLeftColor: PRIORITY_COLORS.medium,
  },
  priorityLow: {
    borderLeftColor: PRIORITY_COLORS.low,
  },
  priorityNone: {
    borderLeftColor: PRIORITY_COLORS.none,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 3,
  },
  compactEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  compactTime: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  compactStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default createTaskCardStyles;
