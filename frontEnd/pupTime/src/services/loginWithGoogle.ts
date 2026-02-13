import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { googleWebClientId } from '@env';

// console.log("googleWebClientId: ", googleWebClientId);
// GoogleSignin.configure({
//   webClientId: googleWebClientId,
//   offlineAccess: true,
// });

export type GoogleUserInfo = {
  idToken: string;
  scopes: string[];
  serverAuthCode: string;
  user: {
    id: string;
    name: string;
    email: string;
    photo: string;
    givenName: string;
    familyName: string;
  };
};

const signInWithGoogle = async (): Promise<GoogleUserInfo | null> => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    return userInfo?.data as GoogleUserInfo;
  } catch (error) {
    console.error('Google sign-in error:', error);
    return null;
  }
};

export default signInWithGoogle;