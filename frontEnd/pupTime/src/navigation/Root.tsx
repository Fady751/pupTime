import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../navigation/AuthNavigator';
import AppNavigator from '../navigation/AppNavigator';
import LoadingScreen from '../screens/Loading/loading';
import OfflineBar from '../components/OfflineBar/offlineBar';
import useNetworkListener from '../Hooks/RootHooks/NetworkBootstrap';
import useAuthBootstrap from '../Hooks/RootHooks/AuthBootstrap';
// import useSyncQueue from '../Hooks/RootHooks/SyncBootstrap';
// import useFetchTasks from '../Hooks/RootHooks/FetchTasks';
import { useEffect } from 'react';
import { getTasks } from '../services/TaskService/tasks';
import { fullSync, getTemplatesWithOverrides } from '../services/TaskService/syncService';
import { TaskTemplateRepository } from '../DB';
// import { AppMetaRepository } from '../DB';

export default function Root() {
  const { data, loading } = useSelector((s: RootState) => s.user);
  const { isConnected, loading: networkLoading } = useSelector((s: RootState) => s.network);

  // useEffect(() => {
  //   useNetworkListener();
  //   useAuthBootstrap();
  // }, []);
    useNetworkListener();
    useAuthBootstrap();
  // useSyncQueue();
  // useFetchTasks();

  useEffect(() => {
    const test = async () => {
      // const task = await getTasks({page: 1, page_size: 1000});
      // console.log("task: ", task);
      // const tasksLocal = await TaskTemplateRepository.getTaskOverrides({user_id: data?.id ?? 0, page: 1, page_size: 1000, ordering: 'start_datetime', start_date: '2026-03-01', end_date: '2026-04-11'});
      // console.log("tasksLocal: ", tasksLocal);
    };
    test();
  }, [data]);

  if (loading || networkLoading) return <LoadingScreen />;

  return (
    <>
      <NavigationContainer>
        <SafeAreaView style={styles.safeArea}>
          {data ? <AppNavigator /> : <AuthNavigator />}
        </SafeAreaView>
      </NavigationContainer>
      {!isConnected && <OfflineBar />}
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
