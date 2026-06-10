import React, { useState } from 'react';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import HomeScreen from '../screens/Home/HomeScreen';
// import IntroNavigator from '../screens/PermissionsIntro/IntroNavigator';
import ProfileScreen from '../screens/ProfileScreen/ProfileScreen';
import EditProfileScreen from '../screens/ProfileScreen/editProfile/EditProfile';
import ScheduleScreen from '../screens/Schedule/ScheduleScreen';
import AiButton from '../components/AiBottom/AiButtom';
import { BottomBar } from '../components/BottomBar/BottomBar';
import TasksScreen from '../screens/Tasks/TasksScreen';
import AddTaskScreen from '../screens/Tasks/AddTaskScreen';
import EditTaskScreen from '../screens/Tasks/EditTaskScreen';
import TemplatesListScreen from '../screens/Tasks/TemplatesList/TemplatesListScreen';
import TemplateDetailsScreen from '../screens/Tasks/TemplateDetails/TemplateDetailsScreen';
import OverrideDetailsScreen from '../screens/Tasks/OverrideDetails/OverrideDetailsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import FriendsListScreen from '../screens/Friends/FriendsListScreen';
import ChatRoomsScreen from '../screens/Chat/ChatRooms/ChatRoomsScreen';
import ChatRoomScreen from '../screens/Chat/ChatRoom/ChatRoomScreen';
import ChatRoomDetailsScreen from '../screens/Chat/ChatRoomDetails/ChatRoomDetailsScreen';
import AddFriendScreen from '../screens/Friends/AddFriendScreen';
import BlockedListScreen from '../screens/Friends/BlockedListScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import AiConversationListScreen from '../screens/AiChat/AiConversationListScreen';
import AiChatScreen from '../screens/AiChat/AiChatScreen';
// import TimerScreen from '../screens/Timer/TimerScreen';
import SocialTasksScreen from '../screens/SocialTasks/SocialTasks';
import IntroNavigator from '../screens/PermissionsIntro/IntroNavigator';


export type AppStackParamList = {
  Home: undefined;
  Intro: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Schedule: undefined;
  Timer: undefined;
  Friends: undefined;
  ChatRooms: undefined;
  ChatRoom: { roomId: number; roomName?: string };
  ChatRoomDetails: { roomId: number };
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
  SocialTask: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

// Screens where we hide the bottom bar and AI button
const CHAT_SCREENS: string[] = ['ChatRoom', 'ChatRoomDetails', 'AiChat', 'AiConversations'];

// Map routes to their BottomBar "current" tab name
const ROUTE_TO_TAB: Record<string, string> = {
  Home: 'Home',
  Schedule: 'Schedule',
  SocialTask: 'SocialTask',
  Tasks: 'Tasks',
  TemplatesList: 'Tasks',
  TemplateDetails: 'Tasks',
  OverrideDetails: 'Tasks',
  AddTask: 'Tasks',
  EditTask: 'Tasks',
  Profile: 'Profile',
  EditProfile: 'Profile',
};

// Wrapper that receives currentRoute as a prop to avoid useNavigationState issues
const AiButtonWithNavigation = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return <AiButton onPress={() => navigation.navigate('AiConversations')} />;
};

const BottomBarWrapper = ({ currentRoute }: { currentRoute: string }) => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const currentTab = ROUTE_TO_TAB[currentRoute] || '';
  return <BottomBar current={currentTab} navigation={navigation} />;
};

const AppNavigator: React.FC = () => {
  // Track current route to determine visibility & active tab
  const [currentRoute, setCurrentRoute] = useState('Home');

  const showAiButton = !CHAT_SCREENS.includes(currentRoute);
  const showBottomBar = currentRoute === 'Home';

  return (
    <>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        screenListeners={{
          focus: (e) => {
            // e.target contains "RouteName-uniqueId", extract the route name
            const target = e.target;
            if (target) {
              const routeName = target.split('-')[0];
              if (routeName) {
                setCurrentRoute(routeName);
              }
            }
          },
        }}
      >
        {/* <Stack.Screen name="Intro" component={IntroNavigator} /> */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Schedule" component={ScheduleScreen} />
        {/* <Stack.Screen name="Timer" component={TimerScreen} /> */}
        <Stack.Screen name="Friends" component={FriendsListScreen} />
        <Stack.Screen name="ChatRooms" component={ChatRoomsScreen} />
        <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
        <Stack.Screen name="ChatRoomDetails" component={ChatRoomDetailsScreen} />
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
        <Stack.Screen name="SocialTask" component={SocialTasksScreen} />
      </Stack.Navigator>
      
      {showBottomBar && <BottomBarWrapper currentRoute={currentRoute} />}
      {showAiButton && <AiButtonWithNavigation />}
    </>
  );
};

export default AppNavigator;
