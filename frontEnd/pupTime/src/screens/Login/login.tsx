import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux/store';
import { fetchUser } from '../../redux/userSlice';
import { saveData } from '../../utils/authStorage';
import { createStyles } from './styles';
import { loginUser } from '../../services/userServices/login';
import LoginGoogle from '../../components/loginGoogle/loginGoogle';
import useTheme from '../../Hooks/useTheme';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const onLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      if(!data.success || !data.token || !data.id) {
        throw new Error(data.error || 'Login failed');
      }
      await saveData({ token: data.token, id: data.id });

      await dispatch(fetchUser());

      navigation.replace('Home');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Log In</Text>
              <Text style={styles.subtitle}>
                Welcome back! Sign in to your account.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      styles.passwordInput,
                      error && styles.inputError,
                    ]}
                    returnKeyType="done"
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
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={onLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Log In</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.divider} />
            </View>

            <LoginGoogle />

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
                <Text
                  style={styles.footerLink}
                  onPress={() => navigation.replace('SignUp')}
                >
                  Sign Up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
