'use client';

/**
 * RejectionModal Component
 * Modal for rejecting emails with predefined reasons
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import EmailApiService from '../../_services/EmailApiService';
import useNotification from '@/utils/hooks/useNotification';

interface RejectionModalProps {
  emailId: string;
  emailSubject?: string;
  onClose: () => void;
}

const REJECTION_REASONS = [
  { value: 'spam', label: 'Spam / Unsolicited Email' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'policy_violation', label: 'Policy Violation' },
  { value: 'security_risk', label: 'Security Risk' },
  { value: 'duplicate', label: 'Duplicate Email' },
  { value: 'incorrect_recipient', label: 'Incorrect Recipient' },
  { value: 'other', label: 'Other (Specify in Comments)' },
];

export default function RejectionModal({ emailId, emailSubject, onClose }: RejectionModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const { openNotification } = useNotification();

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!reason) {
        throw new Error('Please select a rejection reason');
      }
      return await EmailApiService.rejectEmail(emailId, reason, comments);
    },
    onSuccess: (data) => {
      toast.push(
        <Notification type="success" title="Email Rejected">
          {data.message || 'Email rejected successfully'}
        </Notification>,

      );

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email', emailId] });

      onClose();
    },
    onError: (error: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {error?.message || error?.response?.data?.message || 'Failed to reject email'}
        </Notification>,

      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rejectMutation.mutate();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              <ApolloIcon name="ban" className="mr-2 inline text-red-500" />
              Reject Email
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <ApolloIcon name="x" className="text-xl" />
            </button>
          </div>
          {emailSubject && (
            <p className="mt-2 text-sm text-gray-600">
              Subject: <span className="font-medium">{emailSubject}</span>
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Reason Selection */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="">-- Select a reason --</option>
              {REJECTION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Comments */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Additional Comments
              {reason === 'other' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Provide additional details about the rejection..."
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              required={reason === 'other'}
            />
            <p className="mt-1 text-xs text-gray-500">Maximum 500 characters</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="plain"
              onClick={onClose}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={rejectMutation.isPending || !reason}
              loading={rejectMutation.isPending}
              icon={<ApolloIcon name="ban" />}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Email'}
            </Button>
          </div>
        </form>

        {/* Warning Note */}
        <div className="border-t border-gray-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <ApolloIcon name="alert-circle" className="mt-0.5 text-red-600" />
            <p className="text-xs text-red-800">
              <strong>Warning:</strong> Rejecting this email will mark it as rejected and it will be
              moved to the rejected folder. This action can be tracked in the email&apos;s workflow
              history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
