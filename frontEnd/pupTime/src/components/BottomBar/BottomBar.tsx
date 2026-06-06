import React, { useMemo } from "react";
import { Text, View, Pressable } from "react-native";
import { Home, Calendar, ListTodo, User } from "lucide-react-native";
import createStyles from "./styles";
import useTheme from "../../Hooks/useTheme";

export function BottomBar({ current, navigation }: { current: string; navigation: any }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const tabs = [
        { name: 'Home', icon: Home, route: 'Home' },
        { name: 'Plan', icon: Calendar, route: 'Schedule' },
        { name: 'PUP', isCenter: true },
        { name: 'Tasks', icon: ListTodo, route: 'Tasks' },
        { name: 'You', icon: User, route: 'Profile' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.bottomBar}>
                {tabs.map((tab, idx) => {
                    if (tab.isCenter) {
                        return <View key={`center-${idx}`} style={styles.centerSpace} />;
                    }

                    const isActive = current === tab.route;
                    const Icon = tab.icon!;
                    return (
                        <Pressable 
                            key={tab.route} 
                            style={styles.tabItem} 
                            onPress={() => navigation.navigate(tab.route)}
                        >
                            <Icon 
                                color={isActive ? colors.primary : colors.secondaryText} 
                                size={22} 
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <Text style={[styles.tabText, isActive && { color: colors.primary }]}>
                                {tab.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
