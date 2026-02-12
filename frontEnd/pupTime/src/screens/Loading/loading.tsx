import React, { useMemo } from 'react';
import { View, ActivityIndicator, Image, Text } from 'react-native';
import { createStyles } from './styles';
import useTheme from '../../Hooks/useTheme';

const LoadingScreen = () => {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<View style={styles.container}>
			<View style={styles.iconContainer}>
				<Image
					source={require('../../assets/Ai-icon.png')}
					style={styles.icon}
					resizeMode="contain"
				/>
                <Text style={styles.text}>Loading...</Text>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		</View>
	);
};

export default LoadingScreen;

