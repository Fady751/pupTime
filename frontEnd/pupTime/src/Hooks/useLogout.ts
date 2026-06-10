import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { clearUser } from '../redux/slices/userSlice';
import { resetTasks } from '../redux/slices/tasksSlice';
import { clearAllData } from '../DB/drizzleClient';
import NotificationService from '../services/NotificationService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export function useLogout() {
    const dispatch = useDispatch<AppDispatch>();

    const clearAppData = async () => {
        dispatch(resetTasks());
        dispatch(clearUser());
        await clearAllData();
        await NotificationService.cancelAllScheduled();
        try {
            await GoogleSignin.signOut();
        } catch (error) {
            console.log('Google sign out error:', error);
        }
    }

    return async () => {
        await clearAppData();
    };
}
