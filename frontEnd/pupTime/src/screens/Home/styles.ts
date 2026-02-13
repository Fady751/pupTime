import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: colors.text,
  },
  userDataContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: colors.secondaryText,
  },
  value: {
    fontWeight: 'bold',
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.buttonDanger || colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  tryIntroButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  tryIntroButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
