import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import useTheme from '../../Hooks/useTheme';
import { createStyles } from './RecommendationTypes.styles';

/* ═══════════════════════════════════════════════════════════
   RecommendationTypesScreen
   ═══════════════════════════════════════════════════════════ */

const RecommendationTypesScreen: React.FC<void> = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSelect = (type: 'self' | 'friends') => {
    navigation.navigate('RecommendedTasksList', { type });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Hero Header ── */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.heroTitle}>Discover</Text>
        </View>
      </View>

      {/* ── Options ── */}
      <View style={styles.scrollContent}>
        <Text style={styles.sectionTitle}>
          How would you like to discover new hobbies?
        </Text>

        <Pressable
          style={styles.optionBtn}
          onPress={() => handleSelect('friends')}
        >
          <View
            style={[styles.optionIcon, { backgroundColor: '#E0F2FE' }]}
          >
            <Text style={styles.optionEmoji}>👥</Text>
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Based on Friends</Text>
            <Text style={styles.optionDescription}>
              Get hobby suggestions based on what your friends enjoy
            </Text>
          </View>
          <Text style={styles.optionArrow}>→</Text>
        </Pressable>

        <Pressable
          style={styles.optionBtn}
          onPress={() => handleSelect('self')}
        >
          <View
            style={[styles.optionIcon, { backgroundColor: '#D1FAE5' }]}
          >
            <Text style={styles.optionEmoji}>🌍</Text>
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Recommend in General</Text>
            <Text style={styles.optionDescription}>
              Personalised suggestions based on your interests
            </Text>
          </View>
          <Text style={styles.optionArrow}>→</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default RecommendationTypesScreen;
