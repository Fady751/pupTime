import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../navigation/AuthNavigator';
import AppNavigator from '../navigation/AppNavigator';
import LoadingScreen from '../screens/Loading/loading';
import OfflineBar from '../components/OfflineBar/offlineBar';
import useNetworkListener from '../Hooks/RootHooks/NetworkBootstrap';
import useAuthBootstrap from '../Hooks/RootHooks/AuthBootstrap';
import useSyncQueue from '../Hooks/RootHooks/SyncBootstrap';
import useFetchTasks from '../Hooks/RootHooks/FetchTasks';
import { useEffect } from 'react';

export default function Root() {
  const { data, loading } = useSelector((s: RootState) => s.user);
  const { isConnected, loading: networkLoading } = useSelector((s: RootState) => s.network);

  useNetworkListener();
  useAuthBootstrap();
  useSyncQueue();
  useFetchTasks();

  useEffect(() => {
    const test = async () => {

    };
    test()
  }, []);

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
