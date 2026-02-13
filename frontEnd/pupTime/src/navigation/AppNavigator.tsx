import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home/home';
import IntroNavigator from '../screens/PermissionsIntro/IntroNavigator';
import ProfileScreen from '../screens/ProfileScreen/ProfileScreen';
import EditProfile from '../screens/ProfileScreen/EditProfile';
export type AppStackParamList = {
  Home: undefined;
  Intro: undefined;
  Profile: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Intro" component={IntroNavigator} /> */}
      {/* <Stack.Screen name="Profile" component={ProfileScreen} /> */}
      <Stack.Screen name="EditProfile" component={EditProfile} />

    </Stack.Navigator>
  );
};

export default AppNavigator;
