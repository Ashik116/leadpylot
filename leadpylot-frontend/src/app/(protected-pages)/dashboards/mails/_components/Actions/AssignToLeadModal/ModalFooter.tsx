/**
 * ModalFooter Component
 * Footer section with info note for AssignToLeadModal
 */

import ApolloIcon from '@/components/ui/ApolloIcon';

export function ModalFooter() {
  return (
    <div className="border-t border-gray-200 bg-blue-50 p-4">
      <div className="flex items-start gap-2">
        <ApolloIcon name="info-circle" className="mt-0.5 text-blue-600" />
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Assigning this email to a lead will link it to the lead&apos;s
          record and make it available to agents assigned to that lead. The email can then proceed
          through the normal approval workflow.
        </p>
      </div>
    </div>
  );
}

