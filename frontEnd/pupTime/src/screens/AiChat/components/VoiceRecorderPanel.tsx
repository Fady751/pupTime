import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Mic, Pause, Trash2, Send } from 'lucide-react-native';
import { AppColors } from '../../../constants/colors';

interface VoiceRecorderPanelProps {
  isPaused: boolean;
  recordTime: string;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onSend: () => void;
  colors: AppColors;
}

const VoiceRecorderPanel: React.FC<VoiceRecorderPanelProps> = ({
  isPaused,
  recordTime,
  onPause,
  onResume,
  onDelete,
  onSend,
  colors,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Slide-in animation on mount
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pulsating dot when actively recording (not paused)
  useEffect(() => {
    if (!isPaused) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPaused]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [60, 0],
              }),
            },
          ],
          opacity: slideAnim,
        },
      ]}>
      {/* Delete recording */}
      <TouchableOpacity
        style={[styles.circleBtn, { backgroundColor: colors.error + '18' }]}
        onPress={onDelete}
        activeOpacity={0.7}>
        <Trash2 size={20} color={colors.error} />
      </TouchableOpacity>

      {/* Recording indicator + timer */}
      <View style={styles.centerSection}>
        <Animated.View
          style={[
            styles.recordDot,
            { opacity: pulseAnim, backgroundColor: colors.error },
          ]}
        />
        <Text style={[styles.timerText, { color: colors.text }]}>
          {recordTime}
        </Text>
      </View>

      {/* Pause / Resume */}
      <TouchableOpacity
        style={[styles.circleBtn, { backgroundColor: colors.primary + '18' }]}
        onPress={isPaused ? onResume : onPause}
        activeOpacity={0.7}>
        {isPaused ? (
          <Mic size={20} color={colors.primary} />
        ) : (
          <Pause size={20} color={colors.primary} />
        )}
      </TouchableOpacity>

      {/* Send voice */}
      <TouchableOpacity
        style={[styles.sendBtn, { backgroundColor: colors.primary }]}
        onPress={onSend}
        activeOpacity={0.7}>
        <Send size={20} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  timerText: {
    fontSize: 22,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default VoiceRecorderPanel;
