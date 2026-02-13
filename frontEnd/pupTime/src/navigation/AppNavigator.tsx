import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home/home';
import IntroNavigator from '../screens/PermissionsIntro/IntroNavigator';
import ProfileScreen from '../screens/ProfileScreen/ProfileScreen';
import EditProfileScreen from '../screens/ProfileScreen/editProfile/EditProfile';
import AiButton from '../components/AiBottom/AiButtom';
export type AppStackParamList = {
  Home: undefined;
  Intro: undefined;
  Profile: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Intro" component={IntroNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      </Stack.Navigator>
      
      <AiButton onPress={() => console.log('AI assistant pressed')} />
    </>
  );
};

export default AppNavigator;
