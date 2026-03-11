import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { fetchUser } from '../redux/slices/userSlice';
import { AppMetaRepository } from '../DB';
import { downloadCategories } from '../services/TaskService/syncService';

export type LoginData = {
    token: string;
    id: number;
};

export function useLogin() {
    const dispatch = useDispatch<AppDispatch>();
    
    return async (data: LoginData) => {
        await AppMetaRepository.set('authToken', data.token);
        await AppMetaRepository.set('id', data.id.toString());
        await downloadCategories();

        await dispatch(fetchUser());
    };
}
