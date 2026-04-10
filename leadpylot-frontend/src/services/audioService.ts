/**
 * Audio service for managing SIP phone sound effects
 */

// Audio instances for different call states
let incomingCallAudio: HTMLAudioElement | null = null;
let connectingAudio: HTMLAudioElement | null = null;
let ringbackAudio: HTMLAudioElement | null = null;

// Track current playing audio to prevent interruptions
let currentlyPlaying: HTMLAudioElement | null = null;

// Type declaration for HTMLAudioElement.setSinkId which is not in standard TypeScript definitions
declare global {
  interface HTMLAudioElement {
    setSinkId(deviceId: string): Promise<void>;
  }
}

/**
 * Initialize audio elements
 */
export const initAudio = () => {
  // Create audio elements if they don't exist
  if (!incomingCallAudio) {
    incomingCallAudio = new Audio('/audio/call-incoming.mp3');
    incomingCallAudio.loop = true;
    incomingCallAudio.addEventListener('ended', () => {
      if (currentlyPlaying === incomingCallAudio) {
        currentlyPlaying = null;
      }
    });
    incomingCallAudio.addEventListener('pause', () => {
      if (currentlyPlaying === incomingCallAudio) {
        currentlyPlaying = null;
      }
    });
  }
  
  if (!connectingAudio) {
    connectingAudio = new Audio('/audio/call-connecting.mp3');
    connectingAudio.loop = true;
    connectingAudio.addEventListener('ended', () => {
      if (currentlyPlaying === connectingAudio) {
        currentlyPlaying = null;
      }
    });
    connectingAudio.addEventListener('pause', () => {
      if (currentlyPlaying === connectingAudio) {
        currentlyPlaying = null;
      }
    });
  }
  
  if (!ringbackAudio) {
    ringbackAudio = new Audio('/audio/call-ringback.mp3');
    ringbackAudio.loop = true;
    ringbackAudio.addEventListener('ended', () => {
      if (currentlyPlaying === ringbackAudio) {
        currentlyPlaying = null;
      }
    });
    ringbackAudio.addEventListener('pause', () => {
      if (currentlyPlaying === ringbackAudio) {
        currentlyPlaying = null;
      }
    });
  }
};

/**
 * Play incoming call sound
 * @param deviceId Optional audio output device ID
 */
export const playIncomingCallSound = (deviceId?: string) => {
  // Only stop other sounds, not if this is already playing
  if (currentlyPlaying !== incomingCallAudio) {
    stopAllSounds();
  }
  
  initAudio();
  
  if (incomingCallAudio && currentlyPlaying !== incomingCallAudio) {
    if (deviceId && 'setSinkId' in incomingCallAudio) {
      try {
        incomingCallAudio.setSinkId(deviceId);
      } catch (error) {
        // Intentional console error for debugging audio device issues
        // eslint-disable-next-line no-console
        console.error('Error setting audio output device:', error);
      }
    }
    
    currentlyPlaying = incomingCallAudio;
    incomingCallAudio.play().catch(error => {
      // Intentional console error for debugging audio playback issues
      // eslint-disable-next-line no-console
      console.error('Error playing incoming call sound:', error);
      currentlyPlaying = null;
    });
  }
};

/**
 * Play connecting call sound
 * @param deviceId Optional audio output device ID
 */
export const playConnectingSound = (deviceId?: string) => {
  // Only stop other sounds, not if this is already playing
  if (currentlyPlaying !== connectingAudio) {
    stopAllSounds();
  }
  
  initAudio();
  
  if (connectingAudio && currentlyPlaying !== connectingAudio) {
    if (deviceId && 'setSinkId' in connectingAudio) {
      try {
        connectingAudio.setSinkId(deviceId);
      } catch (error) {
        // Intentional console error for debugging audio device issues
        // eslint-disable-next-line no-console
        console.error('Error setting audio output device:', error);
      }
    }
    
    currentlyPlaying = connectingAudio;
    connectingAudio.play().catch(error => {
      // Intentional console error for debugging audio playback issues
      // eslint-disable-next-line no-console
      console.error('Error playing connecting sound:', error);
      currentlyPlaying = null;
    });
  }
};

/**
 * Play ringback sound
 * @param deviceId Optional audio output device ID
 */
export const playRingbackSound = (deviceId?: string) => {
  // Only stop other sounds, not if this is already playing
  if (currentlyPlaying !== ringbackAudio) {
    stopAllSounds();
  }
  
  initAudio();
  
  if (ringbackAudio && currentlyPlaying !== ringbackAudio) {
    if (deviceId && 'setSinkId' in ringbackAudio) {
      try {
        ringbackAudio.setSinkId(deviceId);
      } catch (error) {
        // Intentional console error for debugging audio device issues
        // eslint-disable-next-line no-console
        console.error('Error setting audio output device:', error);
      }
    }
    
    currentlyPlaying = ringbackAudio;
    ringbackAudio.play().catch(error => {
      // Intentional console error for debugging audio playback issues
      // eslint-disable-next-line no-console
      console.error('Error playing ringback sound:', error);
      currentlyPlaying = null;
    });
  }
};

/**
 * Stop all sounds
 */
export const stopAllSounds = () => {
  if (incomingCallAudio) {
    incomingCallAudio.pause();
    incomingCallAudio.currentTime = 0;
  }
  
  if (connectingAudio) {
    connectingAudio.pause();
    connectingAudio.currentTime = 0;
  }
  
  if (ringbackAudio) {
    ringbackAudio.pause();
    ringbackAudio.currentTime = 0;
  }
  
  // Reset currently playing tracker
  currentlyPlaying = null;
};

/**
 * Set audio output device for all sounds
 * @param deviceId Audio output device ID
 */
export const setAudioOutputDevice = (deviceId: string) => {
  initAudio();
  
  const audioElements = [incomingCallAudio, connectingAudio, ringbackAudio];
  
  audioElements.forEach(audio => {
    if (audio && 'setSinkId' in audio) {
      try {
        audio.setSinkId(deviceId);
      } catch (error) {
        // Intentional console error for debugging audio device issues
        // eslint-disable-next-line no-console
        console.error('Error setting audio output device:', error);
      }
    }
  });
};
