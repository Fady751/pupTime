import React from 'react';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import HomeScreen from '../screens/Home/HomeScreen';
// import IntroNavigator from '../screens/PermissionsIntro/IntroNavigator';
import ProfileScreen from '../screens/ProfileScreen/ProfileScreen';
import EditProfileScreen from '../screens/ProfileScreen/editProfile/EditProfile';
import ScheduleScreen from '../screens/Schedule/ScheduleScreen';
import AiButton from '../components/AiBottom/AiButtom';
import TasksScreen from '../screens/Tasks/TasksScreen';
import AddTaskScreen from '../screens/Tasks/AddTaskScreen';
import EditTaskScreen from '../screens/Tasks/EditTaskScreen';
import TemplatesListScreen from '../screens/Tasks/TemplatesList/TemplatesListScreen';
import TemplateDetailsScreen from '../screens/Tasks/TemplateDetails/TemplateDetailsScreen';
import OverrideDetailsScreen from '../screens/Tasks/OverrideDetails/OverrideDetailsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import FriendsListScreen from '../screens/Friends/FriendsListScreen';
import FriendsChatScreen from '../screens/Friends/FriendsChatScreen';
import AddFriendScreen from '../screens/Friends/AddFriendScreen';
import BlockedListScreen from '../screens/Friends/BlockedListScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import AiConversationListScreen from '../screens/AiChat/AiConversationListScreen';
import AiChatScreen from '../screens/AiChat/AiChatScreen';
// import TimerScreen from '../screens/Timer/TimerScreen';

export type AppStackParamList = {
  Home: undefined;
  Intro: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Schedule: undefined;
  Timer: undefined;
  Friends: undefined;
  FriendsChat: { friendUserId?: number; friendName?: string } | undefined;
  Tasks: undefined;
  AddTask: undefined;
  EditTask: { task: any };
  TemplatesList: undefined;
  TemplateDetails: { templateId: string };
  OverrideDetails: { templateId: string; overrideId: string };
  AddFriend: undefined;
  BlockedFriends: undefined;
  Settings: undefined;
  Notifications: undefined;
  AiConversations: undefined;
  AiChat: { conversationId?: string } | undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AiButtonWithNavigation = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return <AiButton onPress={() => navigation.navigate('AiConversations')} />;
};

const AppNavigator: React.FC = () => {
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        {/* <Stack.Screen name="Intro" component={IntroNavigator} /> */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Schedule" component={ScheduleScreen} />
        {/* <Stack.Screen name="Timer" component={TimerScreen} /> */}
        <Stack.Screen name="Friends" component={FriendsListScreen} />
        <Stack.Screen name="FriendsChat" component={FriendsChatScreen} />
        <Stack.Screen name="Tasks" component={TasksScreen} />
        <Stack.Screen name="AddTask" component={AddTaskScreen} />
        <Stack.Screen name="EditTask" component={EditTaskScreen} />
        <Stack.Screen name="TemplatesList" component={TemplatesListScreen} />
        <Stack.Screen name="TemplateDetails" component={TemplateDetailsScreen} />
        <Stack.Screen name="OverrideDetails" component={OverrideDetailsScreen} />
        <Stack.Screen name="AddFriend" component={AddFriendScreen} />
        <Stack.Screen name="BlockedFriends" component={BlockedListScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="AiConversations" component={AiConversationListScreen} />
        <Stack.Screen name="AiChat" component={AiChatScreen} />
      </Stack.Navigator>
      
      <AiButtonWithNavigation />
    </>
  );
};

export default AppNavigator;
