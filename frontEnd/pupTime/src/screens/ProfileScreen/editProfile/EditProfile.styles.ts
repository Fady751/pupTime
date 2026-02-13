import { StyleSheet } from "react-native";
import { AppColors } from "../../../constants/colors";

const createStyles = (colors: AppColors) =>
	StyleSheet.create({
		safe: {
			flex: 1,
			backgroundColor: colors.background,
		},

		keyboardContainer: {
			flex: 1,
		},


		header: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 20,
			paddingTop: 16,
			paddingBottom: 12,
			backgroundColor: colors.surface,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: colors.divider,
			elevation: 4,
		},

		backButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: colors.background,
			marginRight: 12,
		},

		backText: {
			fontSize: 18,
			color: colors.text,
		},

		headerTitle: {
			fontSize: 20,
			fontWeight: "700",
			color: colors.text,
		},

		content: {
			paddingHorizontal: 20,
			paddingTop: 16,
			paddingBottom: 32,
		},

		card: {
			backgroundColor: colors.surface,
			borderRadius: 24,
			padding: 20,
			elevation: 6,
			shadowColor: "#000",
			shadowOpacity: 0.1,
			shadowRadius: 10,
			shadowOffset: { width: 0, height: 4 },
		},

		sectionTitle: {
			fontSize: 16,
			fontWeight: "600",
			color: colors.secondaryText,
			marginBottom: 4,
		},

		fieldLabel: {
			fontSize: 14,
			fontWeight: "600",
			color: colors.text,
			marginTop: 12,
			marginBottom: 6,
		},

		input: {
			borderRadius: 14,
			borderWidth: 1,
			borderColor: colors.border,
			paddingHorizontal: 14,
			paddingVertical: 10,
			fontSize: 14,
			color: colors.text,
			backgroundColor: colors.background,
		},

		errorText: {
			color: colors.error,
			fontSize: 12,
			marginTop: 4,
		},

		genderRow: {
			flexDirection: "row",
			gap: 10,
			marginTop: 4,
		},

		genderChip: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 10,
			borderRadius: 999,
			borderWidth: 1,
		},

		genderChipText: {
			fontSize: 14,
			fontWeight: "600",
		},

		birthdayValue: {
			borderRadius: 14,
			borderWidth: 1,
			borderColor: colors.border,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 14,
			color: colors.text,
			backgroundColor: colors.background,
		},

		dateHint: {
			fontSize: 12,
			color: colors.secondaryText,
			marginTop: 4,
		},

		footer: {
			padding: 20,
			borderTopWidth: StyleSheet.hairlineWidth,
			borderTopColor: colors.divider,
			backgroundColor: colors.surface,
		},

		saveButton: {
			borderRadius: 999,
			paddingVertical: 14,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: colors.primary,
		},

		saveButtonDisabled: {
			opacity: 0.6,
		},

		saveText: {
			color: colors.primaryText,
			fontSize: 16,
			fontWeight: "700",
		},

		loadingRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			marginTop: 8,
			gap: 8,
		},

		loadingText: {
			fontSize: 13,
			color: colors.secondaryText,
		},

		passwordContainer: {
			flexDirection: "row",
			alignItems: "center",
		},

		passwordInput: {
			flex: 1,
			paddingRight: 50,
		},

		togglePasswordButton: {
			position: "absolute",
			right: 12,
			paddingVertical: 4,
			paddingHorizontal: 4,
		},

		togglePasswordText: {
			fontSize: 14,
			color: colors.primary,
			fontWeight: "500",
		},
	});

export default createStyles;

