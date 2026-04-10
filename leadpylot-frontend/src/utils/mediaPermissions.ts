/**
 * Utility functions for checking and requesting media permissions
 */

export interface MediaPermissionsResult {
  hasAccess: boolean;
  error?: string;
  stream?: MediaStream;
}

/**
 * Check if user has granted microphone access
 * @returns Promise with access result
 */
export const checkMicrophoneAccess = async (): Promise<MediaPermissionsResult> => {
  try {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        hasAccess: false,
        error: 'getUserMedia is not supported in this browser'
      };
    }

    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: false 
    });

    return {
      hasAccess: true,
      stream
    };
  } catch (error) {
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone device found';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied by user';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Microphone not supported by this browser';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Microphone constraints cannot be satisfied';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      hasAccess: false,
      error: errorMessage
    };
  }
};

/**
 * Request microphone access and clean up stream
 * @returns Promise with boolean result
 */
export const requestMicrophoneAccess = async (): Promise<boolean> => {
  const result = await checkMicrophoneAccess();
  
  // Clean up stream if access was granted
  if (result.stream) {
    result.stream.getTracks().forEach(track => track.stop());
  }
  
  return result.hasAccess;
};

/**
 * Check microphone permission status without requesting access
 * @returns Promise with permission state
 */
export const getMicrophonePermissionStatus = async (): Promise<PermissionState | null> => {
  try {
    if (!navigator.permissions) {
      return null;
    }

    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return permission.state;
  } catch (error) {
    // Some browsers don't support permission query for microphone
    return null;
  }
};

/**
 * Get available audio input devices
 * @returns Promise with list of audio input devices
 */
export const getAudioInputDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  } catch (error) {
    console.warn('Failed to enumerate audio devices:', error);
    return [];
  }
};

/**
 * Get available audio output devices
 * @returns Promise with list of audio output devices
 */
export const getAudioOutputDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audiooutput');
  } catch (error) {
    console.warn('Failed to enumerate audio devices:', error);
    return [];
  }
};
