import { StyleSheet } from "react-native";
import { AppColors } from "../../constants/colors";

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', // Keeps the dimmed background universal
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: colors.surface, // Matches Light (#FFFFFF) or Dark (#1E293B)
      padding: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      alignItems: 'center',
      borderTopWidth: 1, // Adds a subtle separation line for dark mode
      borderColor: colors.border,
    },
    icon: {
      fontSize: 48,
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text, // Matches Light (#111827) or Dark (#F9FAFB)
      marginBottom: 12,
    },
    description: {
      fontSize: 15,
      color: colors.secondaryText, // Matches Light (#6B7280) or Dark (#9CA3AF)
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    primaryButton: {
      backgroundColor: colors.primary, // Uses your theme's Blue
      width: '100%',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    primaryButtonText: {
      color: colors.primaryText, // Always white
      fontSize: 16,
      fontWeight: 'bold',
    },
    secondaryButton: {
      width: '100%',
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.secondaryText, // Uses secondary text color to make it look like a secondary action
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default createStyles;