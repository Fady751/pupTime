import React, { useMemo } from "react";
import { Text, View } from "react-native";
import createStyles from "./styles";
import useTheme from "../../Hooks/useTheme";

export function BottomBar({ current, navigation }: { current: string; navigation: any }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.bottomBar}>
            <Text style={current === 'Tasks' ? styles.iconActive : styles.icon} onPress={() => navigation.navigate('Tasks')}>📋</Text>
            <Text style={current === 'Friends' ? styles.iconActive : styles.icon} onPress={() => navigation.navigate('Friends')}>🌍</Text>
            <Text style={current === 'Home' ? styles.iconActive : styles.icon} onPress={() => navigation.navigate('Home')}>🏠</Text>
            <Text style={current === 'Timer' ? styles.iconActive : styles.icon} onPress={() => navigation.navigate('Timer')}>⏱</Text>
            <Text style={current === 'Settings' ? styles.iconActive : styles.icon} onPress={() => navigation.navigate('Settings')}>⚙️</Text>
        </View>
    );
}
