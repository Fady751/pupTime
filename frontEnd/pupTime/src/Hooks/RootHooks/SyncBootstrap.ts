import { useEffect } from "react";
import { useSelector } from "react-redux";
import BackgroundService from 'react-native-background-actions';
import { RootState } from "../../redux/store";
import { applyQueue } from "../../services/TaskService/syncService";
import { Platform } from "react-native";

const useSyncQueue = () => {
  const { isConnected, loading } = useSelector((s: RootState) => s.network);

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
        BackgroundService.start(applyQueue, options).catch(console.error);
      }
    } else {
      applyQueue();
    }

    return () => {
      BackgroundService.stop();
    };
  }, [isConnected, loading]);
};

export default useSyncQueue;