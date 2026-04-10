import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../navigation/AuthNavigator';
import AppNavigator from '../navigation/AppNavigator';
import LoadingScreen from '../screens/Loading/loading';
import OfflineBar from '../components/OfflineBar/offlineBar';
import useNetworkListener from '../Hooks/RootHooks/NetworkBootstrap';
import useAuthBootstrap from '../Hooks/RootHooks/AuthBootstrap';
import { useEffect } from 'react';

export default function Root() {
  const { data, loading } = useSelector((s: RootState) => s.user);
  const { isConnected, loading: networkLoading } = useSelector((s: RootState) => s.network);

  useNetworkListener();
  useAuthBootstrap();

  useEffect(() => {
    const test = async () => {
      // console.log("token: ", await AppMetaRepository.get("authToken"));

      // const task = await getTasks({page: 1, page_size: 1000});
      // console.log("task: ", task);
      // const tasksLocal = await TaskTemplateRepository.getTaskOverrides({user_id: data?.id ?? 0, page: 1, page_size: 1000, ordering: 'start_datetime', start_date: '2026-03-01', end_date: '2026-04-11'});
      // console.log("tasksLocal: ", tasksLocal);

      // const conv = await getConversations();
      // console.log("conv: ", conv);

      // for(const c of conv) {
      //   getConversation(c.id).then((conversation) => {
      //     console.log("conversation: ", conversation);
      //   });
      // }

      // const res = await sendMessage({ message: "Hello, AI!" });
      // console.log("res: ", res);
    };
    test();
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
