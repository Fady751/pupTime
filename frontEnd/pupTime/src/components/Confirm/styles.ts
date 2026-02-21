import { StyleSheet } from 'react-native';
import { AppColors } from '../../constants/colors';

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dimmed background
      justifyContent: 'center', // Centers the modal on the screen
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.surface, // Adjusts to light/dark mode
      width: '100%',
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5, // Android shadow
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    body: {
      fontSize: 15,
      color: colors.secondaryText,
      lineHeight: 22,
      marginBottom: 24,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end', // Aligns buttons to the right
      gap: 12, // Space between buttons (if using older React Native, apply margin to the cancel button instead)
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      justifyContent: 'center',
    },
    cancelButtonText: {
      color: colors.secondaryText,
      fontSize: 16,
      fontWeight: '600',
    },
    confirmButton: {
      backgroundColor: colors.primary, // Blue accent color
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      justifyContent: 'center',
    },
    confirmButtonText: {
      color: colors.primaryText, // Always white
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

export default createStyles;