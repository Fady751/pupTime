import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignUp from '../screens/SignUp/signUp';
import Login from '../screens/Login/login';

export type AuthStackParamList = {
  SignUp: undefined;
  Login: undefined;
  // Add other auth screens here, e.g. SignIn: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="Login" component={Login} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
