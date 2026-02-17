import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/Home/HomeScreen';
import IntroNavigator from '../screens/PermissionsIntro/IntroNavigator';
import ProfileScreen from '../screens/ProfileScreen/ProfileScreen';
import EditProfileScreen from '../screens/ProfileScreen/editProfile/EditProfile';
import ScheduleScreen from '../screens/Schedule/ScheduleScreen';
import AiButton from '../components/AiBottom/AiButtom';
import TasksScreen from '../screens/Tasks/TasksScreen';
import AddTaskScreen from '../screens/Tasks/AddTaskScreen';
import EditTaskScreen from '../screens/Tasks/EditTaskScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import FriendsListScreen from '../screens/Friends/FriendsListScreen';
import AddFriendScreen from '../screens/Friends/AddFriendScreen';
import BlockedListScreen from '../screens/Friends/BlockedListScreen';
import TimerScreen from '../screens/Timer/TimerScreen';
export type AppStackParamList = {
  Home: undefined;
  Intro: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Schedule: undefined;
  Timer: undefined;
  Friends: undefined;
  Tasks: undefined;
  AddTask: undefined;
  EditTask: { task: any };
  AddFriend: undefined;
  BlockedFriends: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Intro" component={IntroNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Schedule" component={ScheduleScreen} />
        <Stack.Screen name="Timer" component={TimerScreen} />
        <Stack.Screen name="Friends" component={FriendsListScreen} />
        <Stack.Screen name="Tasks" component={TasksScreen} />
        <Stack.Screen name="AddTask" component={AddTaskScreen} />
        <Stack.Screen name="EditTask" component={EditTaskScreen} />
        <Stack.Screen name="AddFriend" component={AddFriendScreen} />
        <Stack.Screen name="BlockedFriends" component={BlockedListScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
      
      <AiButton onPress={() => console.log('AI assistant pressed')} />
    </>
  );
};

export default AppNavigator;
