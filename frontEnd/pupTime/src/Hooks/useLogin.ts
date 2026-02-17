import { saveData } from '../utils/authStorage';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { fetchUser } from '../redux/userSlice';

export type LoginData = {
    token: string;
    id: number;
};

export function useLogin() {
    const dispatch = useDispatch<AppDispatch>();
    
    return async (data: LoginData) => {
        await saveData({ token: data.token, id: data.id });

        await dispatch(fetchUser());
    };
}
