import { useState, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import AudioRecorderPlayer, { AudioEncoderAndroidType, AudioSourceAndroidType, OutputFormatAndroidType } from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';

const TEMP_DIR = `${RNFS.CachesDirectoryPath}/temp-records`;

const formatTime = (millis: number) => {
  const seconds = Math.floor((millis / 1000) % 60);
  const minutes = Math.floor((millis / (1000 * 60)) % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const ensureDirExists = async () => {
  const folderExists = await RNFS.exists(TEMP_DIR);
  if (!folderExists) await RNFS.mkdir(TEMP_DIR);
};

const checkPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);

      return grants[ 'android.permission.RECORD_AUDIO' ] === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  }
  return true;
};

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordTime, setRecordTime] = useState('00:00');
  
  const recorder = useRef(AudioRecorderPlayer).current;

  const startRecording = async () => {
    if(isRecording) return;
    await checkPermission();
    setRecordTime('00:00');
    setIsPaused(false);
    await ensureDirExists();

    const fileName = `recording_${Date.now()}.mp4`;
    const path = Platform.select({
      ios: `${fileName}.m4a`,
      android: `${TEMP_DIR}/${fileName}`,
    });

    try {
      const audioSet = {
        // Android Settings
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
        AudioSamplingRateAndroid: 44100, // CD Quality
        AudioEncodingBitRateAndroid: 128000, // 128kbps (higher = better quality)

        // iOS Settings
        // AVSampleRateKeyIOS: 44100,
        // AVFormatIDKeyIOS: AVEncodingOption.aac,
        // AVNumberOfChannelsKeyIOS: 2,
        // AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityStatusKeyIOS.high,
      };

      const uri = await recorder.startRecorder(path/*, audioSet*/);
      setIsRecording(true);

      recorder.addRecordBackListener((e) => {
        setRecordTime(formatTime(e.currentPosition));
      });

      const normalizedUri = Platform.OS === 'android' && !uri.startsWith('file://')
        ? `file://${uri}`
        : uri;
      setRecordedUri(normalizedUri);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const pauseRecording = async () => {
    if(!isRecording || isPaused) return;
    try {
      await recorder.pauseRecorder();
      setIsPaused(true);
    } catch (err) {
      console.warn('Failed to pause recording', err);
    }
  };

  const resumeRecording = async () => {
    if(!isRecording || !isPaused) return;
    try {
      await recorder.resumeRecorder();
      setIsPaused(false);
    } catch (err) {
      console.warn('Failed to resume recording', err);
    }
  };

  const stopRecording = async () => {
    if(!isRecording) return;
    try {
      await recorder.stopRecorder();
      recorder.removeRecordBackListener();
      setIsRecording(false);
      setIsPaused(false);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const clearAllRecordings = async () => {
    try {
      if (await RNFS.exists(TEMP_DIR)) {
        await RNFS.unlink(TEMP_DIR);
        await RNFS.mkdir(TEMP_DIR);
        setRecordedUri(null);
        setRecordTime('00:00');
        setIsPaused(false);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const saveRecording = async () => {
    await stopRecording();
    setRecordTime('00:00');
    setRecordedUri(null);
  };

  return {
    isRecording,
    isPaused,
    recordTime,
    recordedUri,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    saveRecording,
    clearAllRecordings,
    clearRecording: async () => {
      if (recordedUri) {
        const cleanPath = Platform.OS === 'android' ? recordedUri.replace('file://', '') : recordedUri;
        await RNFS.unlink(cleanPath);
        setRecordedUri(null);
        setIsRecording(false);
        setRecordTime('00:00');
        setIsPaused(false);
      }
    },
  };
};
