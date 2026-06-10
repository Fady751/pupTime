import React from 'react';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { setNeedsIntro } from '../redux/slices/userSlice';

import HomeScreen from '../screens/Home/HomeScreen';
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
import SocialTasksScreen from '../screens/SocialTasks/SocialTasks';
import CustomDrawerContent from '../components/Sidebar/CustomDrawerContent';
import RecommendationTypesScreen from '../screens/Recommendations/RecommendationTypesScreen';
import RecommendedTasksListScreen from '../screens/Recommendations/RecommendedTasksListScreen';
import RecommendationDetailsScreen from '../screens/Recommendations/RecommendationDetailsScreen';
import EditRecommendationScreen from '../screens/Recommendations/EditRecommendationScreen';
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
  RecommendationTypes: undefined;
  RecommendedTasksList: { type: 'self' | 'friends'; updatedTask?: any; updatedIndex?: number; removedIndex?: number };
  RecommendationDetails: { task: any; index: number; updatedTask?: any };
  EditRecommendation: { task: any; index: number };
};

const Stack = createNativeStackNavigator<AppStackParamList>();
const Drawer = createDrawerNavigator();

const CHAT_SCREENS: string[] = ['ChatRoom', 'ChatRoomDetails', 'AiChat', 'AiConversations'];

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
  RecommendationTypes: 'Home',
  RecommendedTasksList: 'Home',
  RecommendationDetails: 'Home',
  EditRecommendation: 'Home',
};

let routeChangeCallback: ((route: string) => void) | null = null;

const AiButtonWithNavigation = ({ currentRoute }: { currentRoute: string }) => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  if (CHAT_SCREENS.includes(currentRoute)) return null;
  return <AiButton onPress={() => navigation.navigate('AiConversations')} />;
};

const BottomBarWrapper = ({ currentRoute }: { currentRoute: string }) => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  if (currentRoute !== 'Home') return null;
  
  const currentTab = ROUTE_TO_TAB[currentRoute] || '';
  return <BottomBar current={currentTab} navigation={navigation} />;
};

const MainStack = () => (
  <Stack.Navigator 
    screenOptions={{ headerShown: false }}
    screenListeners={{
      focus: (e) => {
        const target = e.target;
        if (target) {
          const routeName = target.split('-')[0];
          if (routeName && routeChangeCallback) {
            routeChangeCallback(routeName);
          }
        }
      },
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Schedule" component={ScheduleScreen} />
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
    <Stack.Screen name="RecommendationTypes" component={RecommendationTypesScreen} />
    <Stack.Screen name="RecommendedTasksList" component={RecommendedTasksListScreen} />
    <Stack.Screen name="RecommendationDetails" component={RecommendationDetailsScreen} />
    <Stack.Screen name="EditRecommendation" component={EditRecommendationScreen} />
    <Stack.Screen name="Intro" component={IntroNavigator} />
  </Stack.Navigator>
);

const AppNavigator: React.FC = () => {
  const [currentRoute, setCurrentRoute] = React.useState('Home');

  React.useEffect(() => {
    routeChangeCallback = setCurrentRoute;
    return () => {
      routeChangeCallback = null;
    };
  }, []);

  const needsIntro = useSelector((state: RootState) => state.user.needsIntro);
  const dispatch = useDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  React.useEffect(() => {
    if (needsIntro) {
      dispatch(setNeedsIntro(false));
      navigation.navigate('Intro');
    }
  }, [needsIntro, dispatch, navigation]);

  const isDrawerEnabled = !CHAT_SCREENS.includes(currentRoute);

  return (
    <>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{ 
          headerShown: false, 
          drawerType: 'slide',
          swipeEnabled: isDrawerEnabled
        }}
      >
        <Drawer.Screen name="MainStack" component={MainStack} />
      </Drawer.Navigator>
      
      <BottomBarWrapper currentRoute={currentRoute} />
      <AiButtonWithNavigation currentRoute={currentRoute} />
    </>
  );
};

export default AppNavigator;
