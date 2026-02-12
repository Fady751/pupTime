import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { googleWebClientId } from '@env';

GoogleSignin.configure({
  webClientId: googleWebClientId,
  offlineAccess: true,
});

const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    console.log("userInfo: ", userInfo);
  } catch (error) {
    console.error('Google sign-in error:', error);
  }
};

export default signInWithGoogle;