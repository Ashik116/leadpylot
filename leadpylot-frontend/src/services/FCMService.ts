import AxiosBase from './axios/AxiosBase';

export interface FCMTokenData {
  token: string;
  device_info?: string;
}

export interface FCMTokenResponse {
  success: boolean;
  message: string;
  data?: {
    token_count?: number;
    enabled?: boolean;
    previous_count?: number;
    remaining_count?: number;
  };
}

class FCMService {
  /**
   * Save FCM token to backend
   * @param token FCM token from Firebase
   * @param deviceInfo Optional device information
   * @returns Promise with response data
   */
  async saveFCMToken(token: string, deviceInfo?: string | Record<string, any>): Promise<FCMTokenResponse> {
    try {
      const deviceInfoString = deviceInfo
        ? typeof deviceInfo === 'string'
          ? deviceInfo
          : JSON.stringify(deviceInfo)
        : 'web-browser';

      const response = await AxiosBase.post<FCMTokenResponse>('/auth/fcm-token', {
        token,
        device_info: deviceInfoString,
      });

      return response.data;
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  /**
   * Remove FCM token from backend
   * @param token FCM token to remove
   * @returns Promise with response data
   */
  async removeFCMToken(token: string): Promise<FCMTokenResponse> {
    try {
      const response = await AxiosBase.delete<FCMTokenResponse>('/auth/fcm-token', {
        data: { token },
      });

      return response.data;
    } catch (error) {
      console.error('Error removing FCM token:', error);
      throw error;
    }
  }

  /**
   * Get user's FCM tokens
   * @returns Promise with user's FCM tokens
   */
  async getFCMTokens(): Promise<FCMTokenResponse> {
    try {
      const response = await AxiosBase.get<FCMTokenResponse>('/auth/fcm-token');
      return response.data;
    } catch (error) {
      console.error('Error getting FCM tokens:', error);
      throw error;
    }
  }

  /**
   * Toggle FCM notifications on/off
   * @param enabled Enable or disable notifications
   * @returns Promise with response data
   */
  async toggleFcmEnabled(enabled: boolean): Promise<FCMTokenResponse> {
    try {
      const response = await AxiosBase.patch<FCMTokenResponse>('/auth/fcm-enabled', {
        enabled,
      });

      return response.data;
    } catch (error) {
      console.error('Error toggling FCM enabled:', error);
      throw error;
    }
  }
}

export default new FCMService();
