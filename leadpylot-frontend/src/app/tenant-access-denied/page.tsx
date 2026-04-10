'use client';

/**
 * Tenant Access Denied Page
 * 
 * Shown when a user tries to access a tenant they're not authorized for.
 * For example, an Admin trying to login to an Agent-only tenant.
 */

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import TENANT_CONFIG from '@/configs/tenant.config';

export default function TenantAccessDeniedPage() {
  const router = useRouter();

  const handleLogout = () => {
    // Clear cookies and redirect to login
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/sign-in');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your account is not authorized to access this tenant.
          </p>

          {/* Tenant Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Tenant
            </p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {TENANT_CONFIG.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Allowed roles: {TENANT_CONFIG.allowedRoles.join(', ')}
            </p>
          </div>

          {/* Help Text */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Please contact your administrator if you believe this is an error,
            or login with an account that has the appropriate role.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="solid"
              className="w-full"
              onClick={handleLogout}
            >
              Sign Out & Try Again
            </Button>
            <Button
              variant="plain"
              className="w-full"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          Tenant ID: {TENANT_CONFIG.id}
        </p>
      </div>
    </div>
  );
}
