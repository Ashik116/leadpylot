import { useCallback, useEffect } from 'react';
import {
  initAudio,
  playIncomingCallSound,
  playConnectingSound,
  playRingbackSound,
  stopAllSounds,
  setAudioOutputDevice
} from '@/services/audioService';

/**
 * Custom hook for managing call audio
 * Provides methods to play different call sounds and manage audio devices
 */
export const useCallAudio = () => {
  // Initialize audio on mount
  useEffect(() => {
    initAudio();
  }, []);

  /**
   * Play incoming call sound
   */
  const playIncomingCall = useCallback((deviceId?: string) => {
    playIncomingCallSound(deviceId);
  }, []);

  /**
   * Play connecting call sound
   */
  const playConnecting = useCallback((deviceId?: string) => {
    playConnectingSound(deviceId);
  }, []);

  /**
   * Play ringback sound
   */
  const playRingback = useCallback((deviceId?: string) => {
    playRingbackSound(deviceId);
  }, []);

  /**
   * Stop all sounds
   */
  const stopSounds = useCallback(() => {
    stopAllSounds();
  }, []);

  /**
   * Set audio output device
   */
  const setOutputDevice = useCallback((deviceId: string) => {
    setAudioOutputDevice(deviceId);
  }, []);

  return {
    playIncomingCall,
    playConnecting,
    playRingback,
    stopSounds,
    setOutputDevice
  };
};

export default useCallAudio;
