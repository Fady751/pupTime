import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { styles } from './styles';

type FieldName = 'fullName' | 'email' | 'password' | 'confirmPassword';

type FormState = Record<FieldName, string>;
type ErrorState = Partial<Record<FieldName, string>>;

const initialForm: FormState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const SignUp: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<ErrorState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: FieldName, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = (): ErrorState => {
    const nextErrors: ErrorState = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    return nextErrors;
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    // Replace this timeout with a real API call.
    setTimeout(() => {
      setIsSubmitting(false);
      // Reset form after "success"
      setForm(initialForm);
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Sign up to start tracking your pup&apos;s adventures.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                value={form.fullName}
                onChangeText={text => handleChange('fullName', text)}
                placeholder="John Doe"
                autoCapitalize="words"
                style={[
                  styles.input,
                  errors.fullName && styles.inputError,
                ]}
                returnKeyType="next"
              />
              {errors.fullName ? (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={form.email}
                onChangeText={text => handleChange('email', text)}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  errors.email && styles.inputError,
                ]}
                returnKeyType="next"
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={form.password}
                onChangeText={text => handleChange('password', text)}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                style={[
                  styles.input,
                  errors.password && styles.inputError,
                ]}
                returnKeyType="next"
              />
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                value={form.confirmPassword}
                onChangeText={text => handleChange('confirmPassword', text)}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                style={[
                  styles.input,
                  errors.confirmPassword && styles.inputError,
                ]}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                isSubmitting && styles.buttonDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text
                style={styles.footerLink}
                // onPress={() => { /* navigate to sign-in */ }}
              >
                Sign in
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUp;
