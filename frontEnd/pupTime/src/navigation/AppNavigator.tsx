import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home/home';
import NotificationPermission from '../screens/PermissionsIntro/NotificationPermission';
import PermissionsIntro from '../screens/PermissionsIntro/PermissionsIntro';
import FreeTimeHabits from '../screens/PermissionsIntro/FreeTimeHabits';
import AssistantIntro from '../screens/Assistant/AssistantIntro';
import VoiceListening from '../screens/Assistant/VoiceListening';

export type AppStackParamList = {
  Home: undefined;
  NotificationPermission: undefined;
  PermissionsIntro: undefined;
  FreeTimeHabits: undefined;
  AssistantIntro: undefined;
  VoiceListening: undefined;
  // Add other app screens here, e.g. Chat: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* <Stack.Screen name="Home" component={Home} /> */}
      {/* <Stack.Screen name="NotificationPermission" component={NotificationPermission} /> */}
      {/* <Stack.Screen name="PermissionsIntro" component={PermissionsIntro} /> */}
     {/* <Stack.Screen name="AssistantIntro" component={AssistantIntro} /> */}
       <Stack.Screen name="VoiceListening" component={VoiceListening} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
