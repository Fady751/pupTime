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
import { useEffect, useState } from 'react';
import { AppMetaRepository } from '../DB/Repositories/AppMetaRepository';
import IntroScreen from '../screens/Intro/Intro';
import useTheme from '../Hooks/useTheme';
import { processWeeklyTasks } from '../services/TaskService/syncService';

export default function Root() {
  const { data, loading } = useSelector((s: RootState) => s.user);
  const { isConnected, loading: networkLoading } = useSelector((s: RootState) => s.network);
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useNetworkListener();
  useAuthBootstrap();

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const alreadyLaunched = await AppMetaRepository.get('already_launched');
        if (!alreadyLaunched) {
          await AppMetaRepository.set('already_launched', 'true');
          setShowIntro(true);
        } else {
          setShowIntro(false);
        }
      } catch (e) {
        console.error('Failed to check already_launched app meta:', e);
        setShowIntro(false); // Default to false if DB check fails
      }
    };
    checkFirstLaunch();
    processWeeklyTasks().catch(e => console.error("Weekly tasks error", e));
  }, []);

  const { colors } = useTheme();

  if (loading || networkLoading || showIntro === null) return <LoadingScreen />;

  if (showIntro) {
    return <IntroScreen onComplete={() => setShowIntro(false)} />;
  }

  return (
    <>
      <NavigationContainer>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
  },
});
