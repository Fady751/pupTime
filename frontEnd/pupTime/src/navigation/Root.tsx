import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchUser } from '../redux/userSlice';
import { SafeAreaView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from '../navigation/AuthNavigator';
import AppNavigator from '../navigation/AppNavigator';

export default function Root() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.user.data);

  useEffect(() => {
    dispatch(fetchUser());
  }, [dispatch]);

  return (
    <NavigationContainer>
      <SafeAreaView style={styles.safeArea}>
        {user ? <AppNavigator /> : <AuthNavigator />}
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
