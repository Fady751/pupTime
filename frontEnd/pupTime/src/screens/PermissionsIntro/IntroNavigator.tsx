import React from 'react';
import NotificationPermission from './NotificationPermission/NotificationPermission';
import PermissionsIntro from './PermissionsIntro/PermissionsIntro';
import FreeTimeHabits from './FreeTimeHabits/FreeTimeHabits';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type IntroStackParamList = {
  PermissionsIntro: undefined;
  NotificationPermission: undefined;
  FreeTimeHabits: undefined;
};

const Stack = createNativeStackNavigator<IntroStackParamList>();

const IntroNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="PermissionsIntro" component={PermissionsIntro} />
            <Stack.Screen name="NotificationPermission" component={NotificationPermission} />
            <Stack.Screen name="FreeTimeHabits" component={FreeTimeHabits} />
        </Stack.Navigator>
    );
};

export default IntroNavigator;