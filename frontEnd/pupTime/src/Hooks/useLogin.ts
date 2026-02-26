import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import { fetchUser } from '../redux/slices/userSlice';
import { AppMetaRepository } from '../DB';

export type LoginData = {
    token: string;
    id: number;
};

export function useLogin() {
    const dispatch = useDispatch<AppDispatch>();
    
    return async (data: LoginData) => {
        await AppMetaRepository.set('authToken', data.token);
        await AppMetaRepository.set('id', data.id.toString());

        // const syncTask = async () => {
            // await syncBackend();
            // await dispatch(fetchTasks(data.id));
        // };

        // await dropAllTables();
        // if(Platform.OS === 'android') {
        //     const options = {
        //         taskName: 'Get Tasks',
        //         taskTitle: 'Getting tasks',
        //         taskDesc: 'Retrieving tasks from backend',
        //         taskIcon: {
        //         name: 'ic_stat_sync',
        //         type: 'drawable',
        //         },
        //         color: '#ff00ff',
        //     };
        //     BackgroundService.start(syncTask, options).catch(console.error);
        // } else {
        //     await syncTask();
        // }

        await dispatch(fetchUser());
    };
}
