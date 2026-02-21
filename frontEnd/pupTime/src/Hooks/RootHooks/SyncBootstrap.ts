import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import BackgroundService from 'react-native-background-actions';
import { RootState } from "../../redux/store";
import { applyQueue } from "../../services/TaskService/syncService";
import { Platform } from "react-native";

const sleep = (ms: number) => new Promise(res => setTimeout(res as any, ms));

const useSyncQueue = () => {
  const { isConnected, loading } = useSelector((s: RootState) => s.network);
  const isSyncing = React.useRef(false);

  useEffect(() => {
    const task = async () => {
      while (isConnected && !loading) {
        if (!isSyncing.current) {
          isSyncing.current = true;
          try {
            await applyQueue();
          } finally {
            isSyncing.current = false;
          }
        }
        await sleep(5000);
      }
    };

    if(Platform.OS === 'android') {
      const options = {
        taskName: 'SyncQueue',
        taskTitle: 'Syncing tasks',
        taskDesc: 'Uploading offline tasks',
        taskIcon: {
          name: 'ic_stat_sync',
          type: 'drawable',
        },
        color: '#ff00ff',
      };

      if (isConnected && !loading) {
        BackgroundService.start(task, options).catch(console.error);
      }
    } else {
      task();
    }

    return () => {
      BackgroundService.stop();
    };
  }, [isConnected, loading]);
};

export default useSyncQueue;