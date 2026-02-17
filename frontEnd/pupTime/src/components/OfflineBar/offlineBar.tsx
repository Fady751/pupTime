import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './styles';

const OfflineBar: React.FC = () => {
  return (
    <View style={styles.offlineBanner}>
        <Text style={styles.offlineText}>You're offline</Text>
    </View>
  );
};

export default OfflineBar;
