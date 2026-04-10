/**
 * ModalHeader Component
 * Header section for AssignToLeadModal
 */

import ApolloIcon from '@/components/ui/ApolloIcon';

interface ModalHeaderProps {
  emailSubject?: string;
  emailFrom?: string;
}

export function ModalHeader({ emailSubject, emailFrom }: ModalHeaderProps) {
  return (
    <div className="border-b border-gray-200 p-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          <ApolloIcon name="user-check" className="mr-2 inline text-blue-500" />
          Assign Email to Lead
        </h2>
      </div>
      {emailSubject && (
        <p className="mt-2 text-sm text-gray-600">
          Subject: <span className="font-medium">{emailSubject}</span>
        </p>
      )}
      {emailFrom && (
        <p className="text-sm text-gray-600">
          From: <span className="font-medium">{emailFrom}</span>
        </p>
      )}
    </div>
  );
}

