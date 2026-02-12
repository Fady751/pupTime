import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    zIndex: -1,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    zIndex: -1,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
  button: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  togglePasswordButton: {
    position: 'absolute',
    right: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  togglePasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  // Google sign-in styles
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
});
