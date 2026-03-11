import { StyleSheet } from "react-native";
import { AppColors } from "../../constants/colors";

export const createStyles = (colors: AppColors) => StyleSheet.create({
  /* ── Layout ─────────────────────────────────── */
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: 24,
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
  },
  backBtnText: {
    fontSize: 20,
    color: "#FFFFFF",
  },

  /* ── Scroll ─────────────────────────────────── */
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 16,
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

  /* ── Section Header (icon + label) ──────────── */
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

  /* ── Title Input ────────────────────────────── */
  titleInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  titleEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  titleInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 14,
  },

  /* ── Categories ─────────────────────────────── */
  categoriesScroll: {
    marginTop: 2,
    maxHeight: 44,
  },
  categoriesScrollContent: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.secondaryText,
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },

  /* ── Priority ───────────────────────────────── */
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  priorityChipSelected: {
    borderWidth: 2,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  /* ── Date/Time Row ──────────────────────────── */
  dateTimeRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateTimeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dateTimeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dateTimeText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  dateTimeLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: "500",
    marginBottom: 2,
  },

  /* ── Duration ───────────────────────────────── */
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  durationIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  durationInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 13,
  },
  durationUnit: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: "500",
  },

  /* ── Repetition ─────────────────────────────── */
  repRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  repChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  repChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  repChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondaryText,
  },
  repChipTextSelected: {
    color: "#FFFFFF",
  },

  /* ── Weekday Chips ──────────────────────────── */
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  weekdayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  weekdayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekdayChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondaryText,
  },
  weekdayChipTextSelected: {
    color: "#FFFFFF",
  },

  /* ── Reminder ───────────────────────────────── */
  reminderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reminderChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  reminderChipSelected: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  reminderChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.secondaryText,
  },
  reminderChipTextSelected: {
    color: "#FFFFFF",
  },
  customReminderRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  customInput: {
    flex: 1,
    backgroundColor: colors.background,
    color: colors.text,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  customAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  customAddBtnText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },

  /* ── Emoji ──────────────────────────────────── */
  selectedEmojiPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    gap: 12,
  },
  selectedEmojiLarge: {
    fontSize: 48,
  },
  clearEmojiBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  clearEmojiBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.secondaryText,
  },
  emojiTabsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  emojiTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  emojiTabActive: {
    backgroundColor: colors.primary,
  },
  emojiTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondaryText,
  },
  emojiTabTextActive: {
    color: "#FFFFFF",
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiSelected: {
    backgroundColor: colors.primary + "25",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiText: {
    fontSize: 22,
  },

  /* ── Action Buttons ─────────────────────────── */
  actionsContainer: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 20,
    gap: 10,
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
  saveText: {
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

  /* ── Loading ────────────────────────────────── */
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

  // ── kept for legacy compat ──
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  header: { fontSize: 28, fontWeight: "bold", color: colors.text, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", color: colors.secondaryText, marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: colors.surface, color: colors.text, padding: 12, borderRadius: 12 },
  priorityContainer: { flexDirection: "row", marginTop: 5 },
  priorityBtn: { padding: 10, borderRadius: 12, backgroundColor: colors.surface, marginRight: 10 },
  prioritySelected: { backgroundColor: "#FACC15" },
  priorityText: { color: colors.text, fontWeight: "600" },
  dateBtn: { backgroundColor: colors.surface, padding: 12, borderRadius: 12 },
  dateText: { color: colors.text },
  reminderContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 5, gap: 8 },
  reminderBtn: { padding: 10, borderRadius: 12, backgroundColor: colors.surface, marginBottom: 4 },
  reminderSelected: { backgroundColor: "#22C55E" },
  reminderText: { color: colors.text },
  weekdayContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 4 },
  weekdayTimeRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginTop: 8, gap: 10 },
  weekdayTimeLabel: { fontSize: 14, fontWeight: "600", color: colors.text, width: 40 },
  weekdayTimeToggle: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  weekdayTimeToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekdayTimeToggleText: { fontSize: 12, fontWeight: "500", color: colors.secondaryText },
  weekdayTimeToggleTextActive: { color: colors.primaryText },
  weekdayTimeValue: { flex: 1, fontSize: 14, color: colors.text, textAlign: "right" },
  inlineRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 10 },
  smallInput: { flex: 1, backgroundColor: colors.surface, color: colors.text, padding: 12, borderRadius: 12 },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: colors.primaryText, fontSize: 22, fontWeight: "bold" },
  emojiContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
  emojiTabsContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
});

export default createStyles;