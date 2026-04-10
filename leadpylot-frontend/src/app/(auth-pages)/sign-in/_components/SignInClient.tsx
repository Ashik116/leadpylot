'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { OnSignInPayload } from '@/components/auth/SignIn';
import SignIn from '@/components/auth/SignIn';
import { useAuthSidebar } from '@/contexts/AuthSidebarContext';
import Alert from '@/components/ui/Alert';

import { useAuth } from '@/hooks/useAuth';
import React from 'react';
import { REDIRECT_URL_KEY } from '@/constants/app.constant';
import { getSafeRedirectPath } from '@/utils/safeRedirectPath';
import { getRoleBasedEntryPath } from '@/utils/roleBasedRouting';
import { useAuthStore } from '@/stores/authStore';

const SignInClient = () => {
  const { login } = useAuth();
  const { setOnError = () => {} } = useAuthSidebar();
  const searchParams = useSearchParams();

  // Compute initial SSO error from URL parameters
  const initialSsoError = useMemo(() => {
    const error = searchParams.get('error');
    const provider = searchParams.get('provider');

    if (error) {
      const decodedError = decodeURIComponent(error);
      return provider === 'authentik' ? `SSO Error: ${decodedError}` : decodedError;
    }
    return null;
  }, [searchParams]);

  const [ssoError, setSsoError] = useState<string | null>(initialSsoError);

  // Clear URL params after component mounts (side effect only, no state update)
  useEffect(() => {
    if (initialSsoError && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('provider');
      window.history.replaceState({}, '', url.toString());
    }
  }, [initialSsoError]);

  const handleSignIn = async ({ values, setSubmitting, setMessage }: OnSignInPayload) => {
    setSubmitting(true);
    setSsoError(null); // Clear any SSO errors when attempting manual login
    try {
      const result = await login(values.email, values.password);
      if (result.error || !result.success) {
        setMessage('Invalid email or password');
        setSubmitting(false);
        setOnError(!result.success);
        return;
      }

      setSubmitting(false);
      const role = useAuthStore.getState().user?.role || '';
      const nextPath = getSafeRedirectPath(searchParams.get(REDIRECT_URL_KEY));
      const destination = nextPath || getRoleBasedEntryPath(role);
      window.location.assign(destination);
    } catch (error: any) {
      setMessage(error.message || 'An unexpected error occurred');
      setSubmitting(false);
    }
  };

  const ssoRedirectTo = getSafeRedirectPath(searchParams.get(REDIRECT_URL_KEY)) ?? '/';

  return (
    <>
      {ssoError && (
        <Alert showIcon className="mb-4" type="danger" closable onClose={() => setSsoError(null)}>
          <span className="break-all">{ssoError}</span>
        </Alert>
      )}
      <SignIn onSignIn={handleSignIn} ssoRedirectTo={ssoRedirectTo} />
    </>
  );
};

export default SignInClient;
