import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home/home';
import IntroNavigator from '../screens/PermissionsIntro/IntroNavigator';
import ProfileScreen from '../screens/ProfileScreen/ProfileScreen';
import EditProfileScreen from '../screens/ProfileScreen/editProfile/EditProfile';
import ScheduleScreen from '../screens/Schedule/ScheduleScreen';
import AiButton from '../components/AiBottom/AiButtom';
import TasksScreen from '../screens/Tasks/TasksScreen';
import AddEditTaskScreen from '../screens/Tasks/AddEditTaskScreen';
export type AppStackParamList = {
  Home: undefined;
  Intro: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Schedule: undefined;
  tasks: undefined;
  AddEditTask: { taskId?: number } | undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Intro" component={IntroNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} /> */}
        {/* <Stack.Screen name="Schedule" component={ScheduleScreen} /> */}
        <Stack.Screen name="tasks" component={TasksScreen} />
        <Stack.Screen name="AddEditTask" component={AddEditTaskScreen} />

      </Stack.Navigator>
      
      <AiButton onPress={() => console.log('AI assistant pressed')} />
    </>
  );
};

export default AppNavigator;
