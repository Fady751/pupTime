import { saveData } from '../utils/storage/auth';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { fetchUser } from '../redux/userSlice';
import { syncBackend } from '../services/TaskService/syncService';
import { dropAllTables } from '../DB';
import BackgroundService from 'react-native-background-actions';
import { Platform } from 'react-native';
import { fetchTasks } from '../redux/tasksSlice';

export type LoginData = {
    token: string;
    id: number;
};

export function useLogin() {
    const dispatch = useDispatch<AppDispatch>();
    
    return async (data: LoginData) => {
        await saveData({ token: data.token, id: data.id });

        const syncTask = async () => {
            await syncBackend();
            await dispatch(fetchTasks(data.id));
        };

        await dropAllTables();
        if(Platform.OS === 'android') {
            const options = {
                taskName: 'Get Tasks',
                taskTitle: 'Getting tasks',
                taskDesc: 'Retrieving tasks from backend',
                taskIcon: {
                name: 'ic_stat_sync',
                type: 'drawable',
                },
                color: '#ff00ff',
            };
            BackgroundService.start(syncTask, options).catch(console.error);
        } else {
            await syncTask();
        }

        await dispatch(fetchUser());
    };
}
