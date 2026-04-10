import type { AxiosError } from 'axios';
import React from 'react';

import { removeAuthToken } from '@/utils/cookies';
import { useAuthStore } from '@/stores/authStore';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

interface ApiErrorResponse {
  error: string;
  code: number;
  trace_id?: string;
}

// Track failed auth attempts to prevent excessive logouts (used by resetAuthFailureCounter)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let failedAuthAttempts = 0;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let lastAuthFailureTime = 0;

// Prevent concurrent or repeated logouts
let isLoggingOut = false;

const AxiosResponseIntrceptorErrorCallback = async (error: AxiosError) => {
  const { response } = error;

  const authStore = useAuthStore.getState();

  // Check for authentication errors (401 Unauthorized)
  if (response?.status === 401) {
    // Extract error info to detect explicit token expiration
    const data = response?.data as Partial<ApiErrorResponse> | undefined;
    const errorMessage =
      (typeof data === 'object' && (data?.error || (data as any)?.message)) || '';
    const errorCode = typeof data === 'object' ? data?.code : undefined;
    const tokenExpired =
      (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('token expired')) ||
      errorCode === 1002; // backend TOKEN_EXPIRED

    const sessionTerminated =
      (typeof errorMessage === 'string' &&
        (errorMessage.toLowerCase().includes('session expired or terminated') ||
          errorMessage.toLowerCase().includes('session not found'))) ||
      errorCode === 1003; // backend SESSION_TERMINATED

    // For explicit token expiration or session termination, force immediate logout to clear tokens
    if ((tokenExpired || sessionTerminated) && typeof window !== 'undefined') {
      if (!isLoggingOut) {
        isLoggingOut = true;
        removeAuthToken();
        authStore.logout();

        // Redirect to login page to refresh the app and clear all state
        window.location.href = '/sign-in';
      }
      return;
    }
  }

  // Handle 404 Not Found errors
  if (response?.status === 404) {
    const url = response.config?.url || 'Unknown URL';
    const data = response?.data as Partial<ApiErrorResponse> | undefined;
    const errorMessage =
      (typeof data === 'object' && (data?.error || (data as any)?.message)) ||
      'The requested resource was not found';

    toast.push(
      React.createElement(
        Notification,
        { title: 'Not Found', type: 'danger', duration: 4000 },
        typeof errorMessage === 'string' ? errorMessage : 'The requested resource was not found'
      )
    );

    // eslint-disable-next-line no-console
    console.warn('404 Not Found:', {
      url,
      error: errorMessage,
      data: response?.data,
    });
  }

  // Handle specific API error codes
  if (response?.data && typeof response.data === 'object') {
    const errorData = response.data as ApiErrorResponse;

    // Handle access denied error (code 1100)
    if (errorData.code === 1100) {
      // eslint-disable-next-line no-console
      console.warn('Access denied error:', {
        error: errorData.error,
        code: errorData.code,
        trace_id: errorData.trace_id,
        url: response.config?.url,
      });
    }
  }
};

// Export function to reset auth failure counter
export const resetAuthFailureCounter = () => {
  failedAuthAttempts = 0;
  lastAuthFailureTime = 0;
};

export default AxiosResponseIntrceptorErrorCallback;
