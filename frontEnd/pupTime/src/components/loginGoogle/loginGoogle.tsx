import React, { useMemo, useState } from 'react';
import {
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { createStyles } from './styles';
import signInWithGoogle, { GoogleUserInfo } from '../../services/loginWithGoogle';
import useTheme from '../../Hooks/useTheme';
import { loginWithGoogle } from '../../services/userAuthServices/googleAuth';
import { useLogin } from '../../Hooks/useLogin';

export default function LoginGoogle() {
  const login = useLogin();
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(false);

  const photo = theme === 'dark'
    ? require('../../assets/signinWithGoogleDark.png')
    : require('../../assets/signinWithGoogleLight.png');

  const handleGoogleSignIn = async () => {
    // guard: ignore extra presses while loading
    if (isLoading) return;

    setIsLoading(true);
    try {
      const userInfo: GoogleUserInfo | null = await signInWithGoogle();

      if (userInfo?.idToken) {
        const googlePayload = {
          id_token: userInfo.idToken,
        };
        const response = await loginWithGoogle(googlePayload);

        if (!response?.token || !response?.id) {
          throw new Error('Failed to login with Google');
        }
        await login({ token: response.token, id: response.id });
      }
    } catch (error) {
      console.error('Google sign in failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

return (
  <TouchableOpacity
    style={styles.googleButton}
    activeOpacity={0.8}
    onPress={handleGoogleSignIn}
    disabled={isLoading}
  >
    {isLoading ? (
      <ActivityIndicator color={colors.primary} />
    ) : (
      <Image
        source={photo}
        style={styles.googleIconImage}
        resizeMode="contain"
      />
    )}
  </TouchableOpacity>
);
}