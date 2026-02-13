import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home/home';
import IntroNavigator from '../screens/PermissionsIntro/IntroNavigator';

export type AppStackParamList = {
  Home: undefined;
  Intro: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Intro" component={IntroNavigator} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
