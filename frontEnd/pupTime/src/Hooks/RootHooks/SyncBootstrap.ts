import { useEffect } from "react";
import { useSelector } from "react-redux";
import BackgroundService from 'react-native-background-actions';
import { RootState } from "../../redux/store";
import { applyQueue } from "../../services/TaskService/syncService";
import { Platform } from "react-native";
import { useTasks } from "../useTasks";

const useSyncQueue = () => {
  const { isConnected, loading } = useSelector((s: RootState) => s.network);
  const id = useSelector((s: RootState) => s.user.data?.id);
  const { refresh } = useTasks(id || null);

  const SyncQueue = async () => {
    const res = await applyQueue();
    if(res.message === 'OK') refresh();
  };

  useEffect(() => {
    if(Platform.OS === 'android') {
      const options = {
        taskName: 'SyncQueue',
        taskTitle: 'Syncing tasks',
        taskDesc: 'Uploading offline tasks',
        taskIcon: {
          name: 'ic_stat_sync',
          type: 'drawable',
        },
        color: '#0048ff',
      };

      if (isConnected && !loading) {
        BackgroundService.start(SyncQueue, options).catch(console.error);
      }
    } else {
      SyncQueue();
    }

    return () => {
      BackgroundService.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, loading]);
};

export default useSyncQueue;