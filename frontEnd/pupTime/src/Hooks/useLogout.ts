import { clearData } from '../utils/storage/auth';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { clearUser } from '../redux/slices/userSlice';
import { clearTasks } from '../redux/slices/tasksSlice';
import { dropAllTables } from '../DB';

export function useLogout() {
    const dispatch = useDispatch<AppDispatch>();

    const clearAppData = async () => {
        await clearData();
        dispatch(clearUser());
        dispatch(clearTasks());
        await dropAllTables();
    }
    
    return async () => {
        await clearAppData();
    };
}
