'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import AxiosBase from '@/services/axios/AxiosBase';
import { AUTHENTIK_STATUS_URL, AUTHENTIK_URL } from '@/constants/api.constant';

interface AuthentikStatus {
  enabled: boolean;
  provider: string;
  baseUrl: string | null;
}

interface AuthentikUrlResponse {
  authorizationUrl: string;
  state: string;
  configured: boolean;
}

interface AuthentikLoginButtonProps {
  className?: string;
  redirectTo?: string;
}

/**
 * Authentik SSO Login Button
 * Checks if Authentik is configured and provides SSO login functionality
 * 
 * NOTE: SSO button is temporarily disabled. Set ENABLE_SSO_BUTTON = true to re-enable.
 */
const ENABLE_SSO_BUTTON = false; // Set to true to enable SSO button

const AuthentikLoginButton = ({ className, redirectTo = '/' }: AuthentikLoginButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if Authentik SSO is configured
  useEffect(() => {
    // Skip API call if SSO button is disabled
    if (!ENABLE_SSO_BUTTON) {
      return;
    }

    const checkAuthentikStatus = async () => {
      try {
        const response = await AxiosBase.get<AuthentikStatus>(AUTHENTIK_STATUS_URL);
        setIsConfigured(response.data.enabled);
      } catch {
        setIsConfigured(false);
      }
    };

    checkAuthentikStatus();
  }, []);

  const handleAuthentikLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the authorization URL from backend
      const response = await AxiosBase.get<AuthentikUrlResponse>(AUTHENTIK_URL, {
        params: { redirect: redirectTo },
      });

      if (response.data.authorizationUrl) {
        // Redirect to Authentik login page
        window.location.href = response.data.authorizationUrl;
      } else {
        setError('Failed to get SSO login URL');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'SSO login failed');
      setIsLoading(false);
    }
  };

  // Don't render if Authentik is not configured (only when SSO is enabled)
  if (ENABLE_SSO_BUTTON) {
    if (isConfigured === null) {
      return null; // Loading state
    }

    if (!isConfigured) {
      return null; // SSO not available
    }
  }

  return (
    <div className={className}>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500 dark:bg-white dark:text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <Button
        block
        variant="default"
        type="button"
        onClick={ENABLE_SSO_BUTTON ? handleAuthentikLogin : undefined}
        disabled={isLoading || !ENABLE_SSO_BUTTON}
        className="flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Spinner size={18} />
            <span>Connecting to SSO...</span>
          </>
        ) : (
          <>
            <AuthentikIcon />
            <span>Sign in with SSO {!ENABLE_SSO_BUTTON && '(Coming Soon)'}</span>
          </>
        )}
      </Button>
    </div>
  );
};

/**
 * Authentik Logo Icon
 */
const AuthentikIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

export default AuthentikLoginButton;
