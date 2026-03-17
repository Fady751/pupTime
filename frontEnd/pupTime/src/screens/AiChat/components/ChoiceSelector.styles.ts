import { StyleSheet } from 'react-native';
import { AppColors } from '../../../constants/colors';

const createChoiceSelectorStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      marginVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      padding: 5,
    },
    tab: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginRight: 8,
      backgroundColor: colors.border,
    },
    activeTab: {
      backgroundColor: colors.primary,
    },
    executedTab: {
      backgroundColor: '#10B981', // keep distinct green for executed
    },
    tabText: {
      fontSize: 14,
      color: colors.text,
    },
    activeTabText: {
      color: colors.primaryText,
      fontWeight: 'bold',
    },
    executedTabText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    previewContainer: {
      padding: 10,
    },
    selectButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    selectButtonText: {
      color: colors.primaryText,
      fontWeight: 'bold',
      fontSize: 16,
    },
    executedBadge: {
      backgroundColor: '#ecfdf5',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#10B981',
    },
    executedBadgeText: {
      color: '#10B981',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

export default createChoiceSelectorStyles;
