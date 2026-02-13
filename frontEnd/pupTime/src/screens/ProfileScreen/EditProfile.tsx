import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from './EditProfile.styles';
import { editUser, EditUserPayload } from '../../services/userAuthServices/editUser';

interface EditProfileProps {
  currentUser?: {
    username: string;
    email: string;
    gender?: string;
    birth_day?: string;
  };
  onClose: () => void;
  onSuccess: (updatedData: any) => void;
}

const EditProfile = ({ 
  currentUser = {
    username: '',
    email: '',
    gender: '',
    birth_day: '',
  },
  onClose, 
  onSuccess 
}: EditProfileProps) => {
  const [formData, setFormData] = useState({
    username: currentUser.username || '',
    email: currentUser.email || '',
    password: '',
    gender: currentUser.gender || '',
    birth_day: currentUser.birth_day || '',
    google_auth_id: null as string | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (formData.username && formData.username.trim().length < 1) {
      newErrors.username = 'Username is required';
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (formData.password && formData.password.length > 0) {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
    }

    if (formData.gender && formData.gender.length > 20) {
      newErrors.gender = 'Gender must be 20 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  }, [errors]);

  const handleGenderSelect = useCallback((gender: string) => {
    setFormData(prev => ({
      ...prev,
      gender,
    }));
  }, []);

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload: EditUserPayload = {};

      if (formData.username) payload.username = formData.username;
      if (formData.email) payload.email = formData.email;
      if (formData.password) payload.password = formData.password;
      if (formData.gender) payload.gender = formData.gender;
      if (formData.birth_day) payload.birth_day = formData.birth_day;
      if (formData.google_auth_id) payload.google_auth_id = formData.google_auth_id;

      const response = await editUser(payload);

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess(response.user);
          onClose();
        }, 1500);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = 
    formData.username !== currentUser.username ||
    formData.email !== currentUser.email ||
    formData.password !== '' ||
    formData.gender !== (currentUser.gender || '') ||
    formData.birth_day !== (currentUser.birth_day || '');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity 
            style={styles.closeBtn}
            onPress={onClose}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* SUCCESS MESSAGE */}
          {success && (
            <View style={styles.successMessage}>
              <Text style={styles.successText}>✓ Profile updated successfully</Text>
            </View>
          )}

          {/* ACCOUNT SECTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>

            {/* USERNAME */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Username
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'username' && styles.inputFocused,
                    errors.username && styles.inputError,
                  ]}
                  placeholder="Enter your username"
                  placeholderTextColor="#9CA3AF"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}
                />
              </View>
              {errors.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
              <Text style={styles.hintText}>Used for login</Text>
            </View>

            {/* EMAIL */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Email
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'email' && styles.inputFocused,
                    errors.email && styles.inputError,
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
              <Text style={styles.hintText}>Must be a valid email address</Text>
            </View>

            {/* PASSWORD */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Password
                <Text style={styles.labelOptional}> (optional - leave blank to keep current)</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'password' && styles.inputFocused,
                    errors.password && styles.inputError,
                  ]}
                  placeholder="Enter new password (min. 8 characters)"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}
                />
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
              <Text style={styles.hintText}>Min. 8 characters recommended</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* PERSONAL SECTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            {/* GENDER */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Gender
                <Text style={styles.labelOptional}> (optional)</Text>
              </Text>
              <View style={styles.genderContainer}>
                {['Male', 'Female', 'Other'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderOption,
                      formData.gender === gender && styles.genderOptionSelected,
                    ]}
                    onPress={() => handleGenderSelect(gender)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        formData.gender === gender && styles.genderTextSelected,
                      ]}
                    >
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* BIRTH DAY */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Birth Date
                <Text style={styles.labelOptional}> (optional)</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'birth_day' && styles.inputFocused,
                    errors.birth_day && styles.inputError,
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                  value={formData.birth_day}
                  onChangeText={(value) => handleInputChange('birth_day', value)}
                  onFocus={() => setFocusedField('birth_day')}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}
                />
              </View>
              {errors.birth_day && (
                <Text style={styles.errorText}>{errors.birth_day}</Text>
              )}
              <Text style={styles.hintText}>Format: YYYY-MM-DD (e.g., 2000-12-25)</Text>
            </View>
          </View>

          {/* BUTTONS */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                (!hasChanges || loading) && styles.primaryButtonDisabled,
                loading && styles.buttonLoading,
              ]}
              onPress={handleSubmit}
              disabled={!hasChanges || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfile;
