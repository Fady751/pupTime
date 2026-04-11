import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { Play, Pause } from 'lucide-react-native';
import { AppColors } from '../../constants/colors';

interface VoicePlayerProps {
  s3Url: string;
  isUserMessage?: boolean;
  colors?: AppColors;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
  s3Url,
  isUserMessage = false,
  colors,
}) => {
  const audioRecorderPlayer = useRef(AudioRecorderPlayer).current;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Theme-aware colors based on context
  const accent = isUserMessage ? '#FFFFFF' : colors?.primary || '#3b82f6';
  const textColor = isUserMessage
    ? 'rgba(255,255,255,0.7)'
    : colors?.secondaryText || '#6b7280';
  const btnBg = isUserMessage
    ? 'rgba(255,255,255,0.2)'
    : colors?.primary || '#3b82f6';
  const sliderMin = accent;
  const sliderMax = isUserMessage
    ? 'rgba(255,255,255,0.3)'
    : colors?.border || '#d1d5db';

  useEffect(() => {
    return () => {
      audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  const onStartPlay = async () => {
    if (!s3Url) return;
    try {
      setIsPlaying(true);
      await audioRecorderPlayer.startPlayer(s3Url);

      audioRecorderPlayer.addPlayBackListener(e => {
        setCurrentPosition(e.currentPosition);
        setDuration(e.duration);
        if (e.currentPosition === e.duration) {
          onStopPlay();
        }
      });
    } catch (err) {
      console.error('Playback error:', err);
      setIsPlaying(false);
    }
  };

  const onPausePlay = async () => {
    await audioRecorderPlayer.pausePlayer();
    setIsPlaying(false);
  };

  const onStopPlay = async () => {
    await audioRecorderPlayer.stopPlayer();
    audioRecorderPlayer.removePlayBackListener();
    setIsPlaying(false);
    setCurrentPosition(0);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: btnBg }]}
        onPress={isPlaying ? onPausePlay : onStartPlay}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : isPlaying ? (
          <Pause size={18} color="#fff" fill="#fff" />
        ) : (
          <Play size={18} color="#fff" fill="#fff" />
        )}
      </TouchableOpacity>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration > 0 ? duration : 1}
          value={currentPosition}
          minimumTrackTintColor={sliderMin}
          maximumTrackTintColor={sliderMax}
          thumbTintColor={accent}
          disabled={isLoading}
        />
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: textColor }]}>
            {formatTime(currentPosition)}
          </Text>
          <Text style={[styles.timeText, { color: textColor }]}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minWidth: 200,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderContainer: {
    flex: 1,
    marginLeft: 8,
  },
  slider: {
    width: '100%',
    height: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  timeText: {
    fontSize: 10,
  },
});

export default VoicePlayer;
