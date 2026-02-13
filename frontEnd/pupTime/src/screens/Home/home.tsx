import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useLogout } from '../../Hooks/logout';
import { createStyles } from './styles';
import useTheme from '../../Hooks/useTheme';

const Home = ({ navigation }: { navigation: any }) => {
  const logout = useLogout();
  const user = useSelector((state: RootState) => state?.user.data);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.username || 'Guest'}!</Text>
      
      {user && (
        <View style={styles.userDataContainer}>
          <Text style={styles.label}>Email: <Text style={styles.value}>{user.email}</Text></Text>
          {user.id && <Text style={styles.label}>ID: <Text style={styles.value}>{user.id}</Text></Text>}
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />

      <TouchableOpacity style={styles.tryIntroButton} onPress={() => {
        navigation.navigate('Intro');
      }}>
        <Text style={styles.tryIntroButtonText}>Try Intro</Text>
      </TouchableOpacity>
      <View style={{ height: 20 }} />

      <TouchableOpacity style={styles.tryIntroButton} onPress={() => {
        navigation.navigate('Profile');
      }}>
        <Text style={styles.tryIntroButtonText}>Try Profile</Text>
      </TouchableOpacity>
    </View>
  );
};



export default Home;
