import { StyleSheet } from 'react-native';
import { AppColors } from '../../../constants/colors';

const createChoicePreviewStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      color: colors.text,
    },
    summaryText: {
      fontSize: 14,
      marginBottom: 8,
      color: colors.secondaryText,
    },
    scheduleWrapper: {
      marginTop: 8,
      borderRadius: 8,
      overflow: 'hidden',
    },
  });

export default createChoicePreviewStyles;
