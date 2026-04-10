'use client';

import AccessDenied from '@/components/shared/AccessDenied';
import { handleApiError } from '@/utils/errorHandler';

interface LeadDetailsPageErrorProps {
  error: unknown;
  leadId: string;
}

export function LeadDetailsPageError({ error, leadId }: LeadDetailsPageErrorProps) {
  const errorResult = handleApiError(error);

  if (errorResult.isAccessDenied) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view this lead. Please contact your administrator if you believe this is an error."
      />
    );
  }

  if (errorResult.isNotFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h2 className="mt-4">No lead found with ID: {leadId}</h2>
        <p className="mt-2 text-gray-600">
          This lead may have been deleted or you may not have access to it.
        </p>
      </div>
    );
  }

  return <div className="p-6">Error: {errorResult.errorMessage}</div>;
}
