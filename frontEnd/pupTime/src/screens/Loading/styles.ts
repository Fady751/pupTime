import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

export const createStyles = (colors: AppColors) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background,
			justifyContent: 'center',
			alignItems: 'center',
		},
		iconContainer: {
			alignItems: 'center',
			justifyContent: 'center',
		},
		icon: {
			width: 160,
			height: 160,
			marginBottom: 24,
            borderRadius: 200
		},
        text: {
            fontSize: 18,
            color: colors.text,
            fontWeight: '500',
        },
	});

