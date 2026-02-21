import { saveData } from '../utils/storage/auth';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { fetchUser } from '../redux/userSlice';
import { syncBackend } from '../services/TaskService/syncService';
import { dropAllTables } from '../DB';

export type LoginData = {
    token: string;
    id: number;
};

export function useLogin() {
    const dispatch = useDispatch<AppDispatch>();
    
    return async (data: LoginData) => {
        await saveData({ token: data.token, id: data.id });

        await dropAllTables();
        await syncBackend();

        await dispatch(fetchUser());
    };
}
