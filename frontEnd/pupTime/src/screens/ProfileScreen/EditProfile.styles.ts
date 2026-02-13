import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },

  container: {
    flex: 1,
  },

  /* HEADER */
  header: {
    height: 100,
    backgroundColor: '#5A67D8',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },

  closeBtn: {
    padding: 8,
  },

  closeText: {
    fontSize: 28,
    color: '#FFF',
  },

  /* SCROLL */
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  /* FORM SECTIONS */
  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A67D8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* INPUT FIELD */
  formGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },

  labelOptional: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '400',
  },

  inputWrapper: {
    position: 'relative',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  inputFocused: {
    borderColor: '#5A67D8',
    backgroundColor: '#FAFBFF',
  },

  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },

  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },

  /* ERRORS & HINTS */
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },

  hintText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },

  /* GENDER PICKER */
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  genderOptionSelected: {
    borderColor: '#5A67D8',
    backgroundColor: '#EEF1FF',
  },

  genderText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },

  genderTextSelected: {
    color: '#5A67D8',
  },

  /* BUTTONS */
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
    marginBottom: 40,
  },

  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },

  primaryButton: {
    backgroundColor: '#5A67D8',
  },

  primaryButtonDisabled: {
    backgroundColor: '#C0CCDA',
  },

  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  secondaryButtonText: {
    color: '#6B7280',
  },

  buttonLoading: {
    opacity: 0.7,
  },

  successMessage: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },

  successText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 13,
  },

  /* DIVIDER */
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
});
