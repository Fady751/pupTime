import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { clearUser } from '../redux/slices/userSlice';
import { resetTasks } from '../redux/slices/tasksSlice';
import { clearAllData } from '../DB/drizzleClient';

export function useLogout() {
    const dispatch = useDispatch<AppDispatch>();

    const clearAppData = async () => {
        dispatch(resetTasks());
        dispatch(clearUser());
        await clearAllData();
    }
    
    return async () => {
        await clearAppData();
    };
}
