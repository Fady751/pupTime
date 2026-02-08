import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home/home';

export type AppStackParamList = {
  Home: undefined;
  // Add other app screens here, e.g. Chat: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
