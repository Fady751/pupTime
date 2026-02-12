import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Image,
} from 'react-native';
import { createStyles } from './styles';
import signInWithGoogle from '../../services/loginWithGoogle';
import useTheme from '../../Hooks/useTheme';

const handleGoogleSignIn = async () => {
    try {
        await signInWithGoogle();
    } catch (error) {
        console.error('Google sign in failed:', error);
    }
};

export default function LoginGoogle() {
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const photo = theme === 'dark'
    ? require('../../assets/signinWithGoogleDark.png')
    : require('../../assets/signinWithGoogleLight.png');
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