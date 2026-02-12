import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Google sign-in styles
export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    fontSize: 14,
    color: colors.secondaryText,
    marginHorizontal: 12,
  },
  googleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  googleIconImage: {
    width: 200,
    height: 50,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EA4335',
  },
});
