import { clearData } from '../utils/storage/auth';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { clearUser } from '../redux/userSlice';

export function useLogout() {
    const dispatch = useDispatch<AppDispatch>();
    
    return async () => {
        await clearData();
        await dispatch(clearUser());
    };
}
