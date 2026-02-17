import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchUser, setUser } from '../redux/userSlice';
import { checkInternetConnectivity } from '../redux/networkSlice';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../navigation/AuthNavigator';
import AppNavigator from '../navigation/AppNavigator';
import LoadingScreen from '../screens/Loading/loading';
import OfflineBar from '../components/OfflineBar/offlineBar';
import NetInfo from '@react-native-community/netinfo';
import { getData } from '../utils/authStorage';

export default function Root() {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading } = useSelector((state: RootState) => state.user);
  const { isConnected, loading: networkLoading} = useSelector((state: RootState) => state.network);

  // Set up network listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      dispatch(checkInternetConnectivity(state.isConnected ?? false));
    });

    NetInfo.fetch().then(state => {
      dispatch(checkInternetConnectivity(state.isConnected ?? false));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  // Fetch user data on app start
  useEffect(() => {
    if(!networkLoading && isConnected) {
      dispatch(fetchUser());
    }
  }, [dispatch, networkLoading, isConnected]);

  // Check for offline data if user is not authenticated and we're offline
  useEffect(() => {
    const checkOfflineData = async () => {
      if(!data && (!loading || !networkLoading) && !isConnected) {
        const offlineData = await getData();
        if(offlineData?.user) {
          dispatch(setUser(offlineData.user));
        }
      }
    };
    checkOfflineData();
  }, [data, loading, isConnected, dispatch, networkLoading]);

  return (
    <>
      <NavigationContainer>
        <SafeAreaView style={styles.safeArea}>
          {loading || networkLoading ? <LoadingScreen /> : data ? <AppNavigator /> : <AuthNavigator />}
        </SafeAreaView>
      </NavigationContainer>
      {!isConnected && !networkLoading && <OfflineBar />}
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
