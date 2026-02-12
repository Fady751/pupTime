import { clearData } from '../utils/authStorage';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { clearUser } from '../redux/userSlice';

export function useLogout() {
    const dispatch = useDispatch<AppDispatch>();
    const navigation = useNavigation();
    
    return async () => {
        await clearData();
        await dispatch(clearUser());
        navigation.navigate('Login' as never);
    };
}
