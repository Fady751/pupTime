import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchUser } from '../redux/userSlice';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../navigation/AuthNavigator';
import AppNavigator from '../navigation/AppNavigator';
import LoadingScreen from '../screens/Loading/loading';

export default function Root() {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    dispatch(fetchUser());
  }, [dispatch]);

  return (
    <NavigationContainer>
      <SafeAreaView style={styles.safeArea}>
        {loading ? <LoadingScreen /> : data ? <AppNavigator /> : <AuthNavigator />}
      </SafeAreaView>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
