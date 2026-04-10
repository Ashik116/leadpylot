'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { setAuthTokens } from '@/utils/cookies';
import Spinner from '@/components/ui/Spinner';

/**
 * OAuth Callback Page
 * Handles the redirect from external authentication providers (Authentik)
 * Extracts token and user data from URL parameters and stores them
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  const { login } = useAuthStore();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Check for error from OAuth provider
        const errorParam = searchParams.get('error');
        if (errorParam) {
          setError(decodeURIComponent(errorParam));
          setIsProcessing(false);
          return;
        }

        // Get token and user from URL parameters
        const token = searchParams.get('token');
        const userParam = searchParams.get('user');
        const redirectTo = searchParams.get('redirect') || '/';
        const provider = searchParams.get('provider');

        if (!token || !userParam) {
          setError('Invalid callback: missing authentication data');
          setIsProcessing(false);
          return;
        }

        // Parse user data
        let userData;
        try {
          userData = JSON.parse(userParam);
        } catch (e) {
          setError('Invalid user data format');
          setIsProcessing(false);
          return;
        }

        // Transform user data to match the auth store format
        const transformedUser = {
          id: userData._id,
          name: userData.login,
          email: userData.login,
          role: userData.role,
          accessToken: token,
          view_type: userData.view_type,
          voip_extension: userData.voip_extension || null,
          voip_password: userData.voip_password || null,
          voip_enabled: userData.voip_enabled || false,
        };

        // Store authentication data
        login(transformedUser);
        setAuthTokens(token);

        console.log(`[Auth Callback] Successfully authenticated via ${provider}`);

        // Clean redirect - remove sensitive data from URL
        // Small delay to ensure state is saved
        setTimeout(() => {
          router.replace(redirectTo);
        }, 100);
      } catch (err: any) {
        console.error('[Auth Callback] Error processing callback:', err);
        setError(err.message || 'Failed to process authentication');
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, login, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Authentication Failed
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">{error}</p>
            <button
              onClick={() => router.push('/sign-in')}
              className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Spinner size={40} />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {isProcessing ? 'Completing sign in...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}
