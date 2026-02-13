import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Image,
} from 'react-native';
import { createStyles } from './styles';
import signInWithGoogle, { GoogleUserInfo } from '../../services/loginWithGoogle';
import useTheme from '../../Hooks/useTheme';
import { loginWithGoogle } from '../../services/userAuthServices/googleAuth';
import { saveData } from '../../utils/authStorage';
import { fetchUser } from '../../redux/userSlice';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux/store';

export default function LoginGoogle({ navigation }: { navigation: any }) {
  const { theme, colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const photo = theme === 'dark'
    ? require('../../assets/signinWithGoogleDark.png')
    : require('../../assets/signinWithGoogleLight.png');

    const handleGoogleSignIn = async () => {
      try {
          const userInfo: GoogleUserInfo | null = await signInWithGoogle();

          if (userInfo?.idToken) {
            const googlePayload = {
              id_token: userInfo.idToken,
            };
            const response = await loginWithGoogle(googlePayload);
            
            await saveData({ token: response.token as string, id: response.id as number });
      
            await dispatch(fetchUser());
      
            navigation.replace('Home');
          }

      } catch (error) {
          console.error('Google sign in failed:', error);
      }
  };

  return (
    <TouchableOpacity
      style={styles.googleButton}
      activeOpacity={0.8}
      onPress={handleGoogleSignIn}
    >
      <Image
        source={photo}
        style={styles.googleIconImage}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}