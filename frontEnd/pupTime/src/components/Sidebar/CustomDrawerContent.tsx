import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import useTheme from '../../Hooks/useTheme';
import { 
  Home, 
  CheckSquare, 
  Calendar, 
  Settings, 
  User, 
  Users, 
  MessageSquare,
  List,
  LogOut
} from 'lucide-react-native';
import { useLogout } from '../../Hooks/useLogout';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DrawerItem = ({ item, isActive, onPress, colors }: any) => {
  const scale = useSharedValue(1);
  const bgColorOpacity = useSharedValue(isActive ? 0.15 : 0);

  // Update background opacity if isActive changes from outside
  React.useEffect(() => {
    bgColorOpacity.value = withTiming(isActive ? 0.15 : 0, { duration: 300 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedBgStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: item.color,
      opacity: bgColorOpacity.value,
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      borderRadius: 16,
    };
  });

  return (
    <AnimatedPressable
      style={[styles.navItem, animatedStyle]}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 15, stiffness: 300 });
        if (!isActive) bgColorOpacity.value = withTiming(0.08, { duration: 150 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        if (!isActive) bgColorOpacity.value = withTiming(0, { duration: 200 });
      }}
      onPress={onPress}
    >
      <Animated.View style={animatedBgStyle} />
      <View style={[styles.iconContainer, { backgroundColor: item.color + '26' }]}>
        <item.icon size={22} color={item.color} />
      </View>
      <Text style={[
        styles.navLabel, 
        { color: colors.text }, 
        isActive && { fontWeight: '800', color: item.color }
      ]}>
        {item.label}
      </Text>
    </AnimatedPressable>
  );
};

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.user.data);
  const navigation = useNavigation<any>();
  const logout = useLogout();

  const getInitials = () => {
    if (!user?.username) return '👤';
    const parts = user.username.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.username.slice(0, 2).toUpperCase();
  };

  const currentRouteName = useNavigationState((state) => {
    if (!state) return 'Home';
    const route = state.routes[state.index];
    if (route.state && route.state.routes) {
      return route.state.routes[route.state.index].name;
    }
    return route.name;
  });

  const navItems = [
    { label: 'Home', route: 'Home', icon: Home, color: '#3B82F6' },
    { label: 'Tasks', route: 'Tasks', icon: CheckSquare, color: '#10B981' },
    { label: 'Hobbies', route: 'TemplatesList', icon: List, color: '#F59E0B' },
    { label: 'Schedule', route: 'Schedule', icon: Calendar, color: '#8B5CF6' },
    { label: 'Friends', route: 'Friends', icon: Users, color: '#EC4899' },
    { label: 'AI Chat', route: 'AiConversations', icon: MessageSquare, color: '#6366F1' },
    { label: 'Profile', route: 'Profile', icon: User, color: '#06B6D4' },
    { label: 'Settings', route: 'Settings', icon: Settings, color: '#14B8A6' },
    { label: 'Log Out', action: logout, icon: LogOut, color: '#EF4444' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Header Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.card, paddingTop: insets.top + 20 }]}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.text }]}>{user?.username || 'Guest'}</Text>
          </View>
        </View>

        {/* Main Navigation Items */}
        <View style={[styles.navSection, { paddingBottom: insets.bottom + 20 }]}>
          {navItems.map((item, index) => {
            const isActive = currentRouteName === item.route;
            return (
              <React.Fragment key={index}>
                {index === 6 && (
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                )}
                <DrawerItem 
                  item={item} 
                  isActive={isActive} 
                  colors={colors} 
                  onPress={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.route) {
                      navigation.navigate(item.route);
                    }
                  }} 
                />
              </React.Fragment>
            );
          })}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        </View>
      </DrawerContentScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: 34,
    color: '#FFF',
    fontWeight: '800',
  },
  userInfo: {
    alignItems: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  navSection: {
    paddingHorizontal: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  separator: {
    height: 1,
    marginVertical: 16,
    marginHorizontal: 16,
    opacity: 0.5,
  },
});

export default CustomDrawerContent;
