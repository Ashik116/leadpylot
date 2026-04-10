'use client';

/**
 * AttachmentApprovalSelector Component
 * Allows selecting individual attachments to approve
 */

import { useState } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';

export interface Attachment {
  document_id: string;
  filename: string;
  size: number;
  mime_type: string;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
}

interface AttachmentApprovalSelectorProps {
  attachments: Attachment[];
  onApprove: (attachmentIds: string[]) => void;
  onUnapprove?: (attachmentIds: string[]) => void;
  isApproving: boolean;
  isUnapproving?: boolean;
}

export default function AttachmentApprovalSelector({
  attachments,
  onApprove,
  onUnapprove,
  isApproving,
  isUnapproving = false,
}: AttachmentApprovalSelectorProps) {
  // Separate approved and pending attachments
  const approvedAttachments = attachments.filter((att) => att.approved);
  const pendingAttachments = attachments.filter((att) => !att.approved);

  // Track selected attachment IDs for approval - initialize with all pending attachments
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    attachments.filter((att) => !att.approved).map((att) => att.document_id)
  );

  // Track selected approved attachments for unapproval
  const [selectedApprovedIds, setSelectedApprovedIds] = useState<string[]>([]);

  const handleToggle = (attachmentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(attachmentId)
        ? prev.filter((id) => id !== attachmentId)
        : [...prev, attachmentId]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(pendingAttachments.map((att) => att.document_id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Handlers for approved attachments
  const handleToggleApproved = (attachmentId: string) => {
    setSelectedApprovedIds((prev) =>
      prev.includes(attachmentId)
        ? prev.filter((id) => id !== attachmentId)
        : [...prev, attachmentId]
    );
  };

  const handleSelectAllApproved = () => {
    setSelectedApprovedIds(approvedAttachments.map((att) => att.document_id));
  };

  const handleDeselectAllApproved = () => {
    setSelectedApprovedIds([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'picture' as const;
    if (mimeType.startsWith('video/')) return 'file' as const;
    if (mimeType.includes('pdf')) return 'file' as const;
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file' as const;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file' as const;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'file' as const;
    return 'paperclip' as const;
  };

  return (
    <div className="space-y-4">
      {/* Approved Attachments Section */}
      {approvedAttachments.length > 0 && onUnapprove && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-green-200 pb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
              <ApolloIcon name="check" className="text-green-600" />
              Approved Attachments ({approvedAttachments.length})
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAllApproved}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                disabled={isUnapproving}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAllApproved}
                className="text-xs text-gray-600 hover:text-gray-700 hover:underline"
                disabled={isUnapproving}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Approved Attachment List */}
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {approvedAttachments.map((attachment) => {
              const isSelected = selectedApprovedIds.includes(attachment.document_id);

              return (
                <label
                  key={attachment.document_id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-red-300 bg-red-50'
                      : 'border-green-200 bg-green-50 hover:border-green-300'
                  } ${isUnapproving ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleApproved(attachment.document_id)}
                    disabled={isUnapproving}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />

                  {/* File Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? 'bg-red-100' : 'bg-green-100'
                    }`}
                  >
                    <ApolloIcon
                      name={getFileIcon(attachment.mime_type)}
                      className={`text-lg ${isSelected ? 'text-red-600' : 'text-green-600'}`}
                    />
                  </div>

                  {/* File Info */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {attachment.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)} •{' '}
                      {attachment.mime_type.split('/')[1]?.toUpperCase()}
                    </div>
                  </div>

                  {/* Approved Indicator */}
                  {!isSelected && <ApolloIcon name="check" className="shrink-0 text-green-600" />}
                </label>
              );
            })}
          </div>

          {/* Unapprove Button */}
          {selectedApprovedIds.length > 0 && (
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onUnapprove(selectedApprovedIds)}
                disabled={isUnapproving}
                loading={isUnapproving}
                icon={<ApolloIcon name="x" />}
              >
                {isUnapproving
                  ? 'Removing Approval...'
                  : `Remove Approval (${selectedApprovedIds.length})`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pending Attachments Section */}
      {pendingAttachments.length > 0 && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <ApolloIcon name="times" className="text-amber-600" />
              Pending Approval ({pendingAttachments.length})
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                disabled={isApproving}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs text-gray-600 hover:text-gray-700 hover:underline"
                disabled={isApproving}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Attachment List */}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {pendingAttachments.map((attachment) => {
              const isSelected = selectedIds.includes(attachment.document_id);

              return (
                <label
                  key={attachment.document_id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  } ${isApproving ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(attachment.document_id)}
                    disabled={isApproving}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />

                  {/* File Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    <ApolloIcon
                      name={getFileIcon(attachment.mime_type) as any}
                      className={`text-lg ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}
                    />
                  </div>

                  {/* File Info */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {attachment.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)} •{' '}
                      {attachment.mime_type.split('/')[1]?.toUpperCase()}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <ApolloIcon name="check-circle" className="shrink-0 text-blue-600" />
                  )}
                </label>
              );
            })}
          </div>

          {/* Approve Button */}
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-2">
            <Button
              size="sm"
              variant="success"
              onClick={() => onApprove(selectedIds)}
              disabled={isApproving || selectedIds.length === 0}
              loading={isApproving}
              icon={<ApolloIcon name="check-circle" />}
            >
              {isApproving ? 'Approving...' : `Approve Selected (${selectedIds.length})`}
            </Button>
          </div>

          {/* Warning */}
          {selectedIds.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <ApolloIcon name="filter" className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800">
                Please select at least one attachment to approve
              </p>
            </div>
          )}
        </div>
      )}

      {/* Message when all approved */}
      {pendingAttachments.length === 0 && approvedAttachments.length === 0 && (
        <div className="p-4 text-center text-sm text-gray-500">No attachments found</div>
      )}

      {/* Success message when all approved */}
      {pendingAttachments.length === 0 && approvedAttachments.length > 0 && !onUnapprove && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <ApolloIcon name="check" className="mt-0.5 shrink-0 text-green-600" />
          <p className="text-xs text-green-800">All attachments are approved ✓</p>
        </div>
      )}
    </div>
  );
}
