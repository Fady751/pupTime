import React, { useState } from 'react';
import Toast from 'react-native-toast-message';

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
import { signUp, SignUpPayload } from '../../services/userServices/signup';
import { validate } from '../../utils/validateForm';

type FieldName = 'username' | 'email' | 'password' | 'gender' | 'birth_day';

export type FormState = Record<FieldName, string>;
export type ErrorState = Partial<Record<FieldName, string>>;

const initialForm: FormState = {
  username: '',
  email: '',
  password: '',
  gender: '',
  birth_day: '',
};

const SignUp = ({ navigation }: { navigation: any }) => {
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
      handleChange('birth_day', `${year}-${month}-${day}`);
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validate(form);
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
        birth_day: form.birth_day.trim(),
      };

      const response = await signUp(payload);
      console.log('Sign up response:', response);

      if(!response.success) {
        const error = response?.error || {};
        const nextErrors: ErrorState = {};
        if (error?.username)
          nextErrors.username = error.username[0] || 'Username error';
        if (error?.email)
          nextErrors.email = error.email[0] || 'Email error';
        if (error?.password)
          nextErrors.password = error.password[0] || 'Password error';
        if (error?.gender)
          nextErrors.gender = error.gender[0] || 'Gender error';
        if (error?.birth_day)
          nextErrors.birth_day = error.birth_day[0] || 'Birth date error';
        setErrors(nextErrors);
      }
      else {
        Toast.show({
          type: 'success',
          text1: 'Sign up successful',
          text2: 'Your account has been created',
          position: 'top',
          visibilityTime: 2000,
          autoHide: true,
          topOffset: 50,
        });
        setTimeout(() => {
          navigation.replace('Login');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Sign up failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Toast />
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
                    errors.birth_day && styles.inputError,
                  ]}
                >
                  <Text
                    style={{
                      color: form.birth_day ? '#111827' : '#9CA3AF',
                    }}
                  >
                    {form.birth_day || 'Select birth date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={
                      form.birth_day
                        ? new Date(form.birth_day)
                        : new Date(2000, 0, 1)
                    }
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={handleDateChange}
                  />
                )}
                {errors.birth_day ? (
                  <Text style={styles.errorText}>{errors.birth_day}</Text>
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
                  onPress={() => { navigation.replace('Login') }}
                >
                  Sign in
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

export default SignUp;
