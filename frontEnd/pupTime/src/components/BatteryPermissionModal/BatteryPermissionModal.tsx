import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import notifee from '@notifee/react-native';
import useTheme from '../../Hooks/useTheme';
import createStyles from './styles';

const BatteryPermissionModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  const { colors } = useTheme();
  
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const checkSettings = async () => {
      const isRestricted = await notifee.isBatteryOptimizationEnabled();
      if (isRestricted) {
        setIsVisible(true);
      }
    };
    checkSettings();
  }, []);

  const handleFixNow = async () => {
    await notifee.openBatteryOptimizationSettings();
    setIsVisible(false); 
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          
          <Text style={styles.icon}>🔋</Text> 
          
          <Text style={styles.title}>Don't Miss a Task</Text>
          
          <Text style={styles.description}>
            Your phone is currently restricting background alarms to save battery. 
            To get reminders for your tasks, please allow unrestricted battery usage.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleFixNow}>
            <Text style={styles.primaryButtonText}>Fix in Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsVisible(false)}>
            <Text style={styles.secondaryButtonText}>Maybe Later</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

export default BatteryPermissionModal;