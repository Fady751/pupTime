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
import { Picker } from '@react-native-picker/picker';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { styles } from './styles';
import { signUp, SignUpPayload } from '../../services/SignUp/signUp-api';

type FieldName = 'username' | 'email' | 'password' | 'gender' | 'birthDate';

type FormState = Record<FieldName, string>;
type ErrorState = Partial<Record<FieldName, string>>;

const initialForm: FormState = {
  username: '',
  email: '',
  password: '',
  gender: '',
  birthDate: '',
};

const SignUp: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<ErrorState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: FieldName, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (date) {
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      handleChange('birthDate', `${year}-${month}-${day}`);
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const validate = (): ErrorState => {
    const nextErrors: ErrorState = {};

    if (!form.username.trim()) {
      nextErrors.username = 'Username is required.';
    } else if (form.username.length < 3) {
      nextErrors.username = 'Username must be at least 3 characters.';
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

    if (!form.gender.trim()) {
      nextErrors.gender = 'Gender is required.';
    }

    if (!form.birthDate.trim()) {
      nextErrors.birthDate = 'Birth date is required.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) {
      nextErrors.birthDate = 'Use format YYYY-MM-DD.';
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: SignUpPayload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        gender: form.gender.trim(),
        birthDate: form.birthDate.trim(),
      };

      const response = await signUp(payload);
      console.log('Sign up response:', response);

      setForm(initialForm);
    } catch (error) {
      console.error('Sign up failed:', error);
    } finally {
      setIsSubmitting(false);
    }
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
              <Text style={styles.label}>Username</Text>
              <TextInput
                value={form.username}
                onChangeText={text => handleChange('username', text)}
                placeholder="pup_lover123"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                style={[styles.input, errors.username && styles.inputError]}
                returnKeyType="next"
              />
              {errors.username ? (
                <Text style={styles.errorText}>{errors.username}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={form.email}
                onChangeText={text => handleChange('email', text)}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, errors.email && styles.inputError]}
                returnKeyType="next"
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={form.password}
                  onChangeText={text => handleChange('password', text)}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password && styles.inputError,
                  ]}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(prev => !prev)}
                  style={styles.togglePasswordButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.togglePasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View
                style={[
                  styles.input,
                  errors.gender && styles.inputError,
                  { paddingHorizontal: 0, paddingVertical: 0 },
                ]}
              >
                <Picker
                  selectedValue={form.gender}
                  onValueChange={value => handleChange('gender', value)}
                  style={{ color: form.gender ? '#000' : '#9CA3AF', flex: 1 }}
                >
                  <Picker.Item
                    label="Select gender"
                    value=""
                    color="#9CA3AF"
                  />
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                </Picker>
              </View>
              {errors.gender ? (
                <Text style={styles.errorText}>{errors.gender}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Birth date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.input,
                  errors.birthDate && styles.inputError,
                  { justifyContent: 'center' },
                ]}
              >
                <Text
                  style={{
                    color: form.birthDate ? '#111827' : '#9CA3AF',
                  }}
                >
                  {form.birthDate || 'Select birth date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={
                    form.birthDate
                      ? new Date(form.birthDate)
                      : new Date(2000, 0, 1)
                  }
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}
              {errors.birthDate ? (
                <Text style={styles.errorText}>{errors.birthDate}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
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
