import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { fetchUser, setNeedsIntro } from '../redux/slices/userSlice';
import { AppMetaRepository } from '../DB';
import { downloadCategories } from '../services/TaskService/syncService';

export type LoginData = {
    token: string;
    id: number;
    needsIntro?: boolean;
};

export function useLogin() {
    const dispatch = useDispatch<AppDispatch>();
    
    return async (data: LoginData) => {
        await AppMetaRepository.set('authToken', data.token);
        await AppMetaRepository.set('id', data.id.toString());
        await downloadCategories();

        dispatch(setNeedsIntro(data.needsIntro ?? false));
        await dispatch(fetchUser());
    };
}
