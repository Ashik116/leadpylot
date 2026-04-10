import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Dialog from '@/components/ui/Dialog';
import { useEffect, useState } from 'react';
import { getAssignmentSummary } from '../hooks/useDocumentsPage';
import ApolloIcon from '@/components/ui/ApolloIcon';
import ConfirmationInput from '@/components/shared/ConfirmationInput';

const DocumentDeleteModal = ({
  onClose,
  isOpen,
  selectedRows,
  permanentDelete,
  setPermanentDelete,
  handleDelete,
  bulkDeleteMutation,
}: any) => {
  const assignmentSummary = getAssignmentSummary(selectedRows);
  const hasAssigned = assignmentSummary.totalAssigned > 0;
  const hasUnassigned = assignmentSummary.totalUnassigned > 0;
  // Delete dialog state management
  const [deleteStep, setDeleteStep] = useState<'choose' | 'confirm'>('choose');
  const [selectedDeleteAction, setSelectedDeleteAction] = useState<
    'unassign-delete' | 'delete-unassigned' | 'delete-only' | null
  >(null);

  useEffect(() => {
    if (isOpen) {
      setDeleteStep('choose');
    }
  }, [isOpen]);
  return (
    <div>
      <Dialog
        isOpen={isOpen}
        onClose={() => {
          onClose?.();
          setDeleteStep('choose');
          setSelectedDeleteAction(null);
        }}
        width={500}
      >
        <div className="">
          {deleteStep === 'choose' && (
            <div className="space-y-2">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900">Delete Documents</h3>
                <p className="mt-1 text-sm text-gray-600">
                  You have selected {selectedRows.length} document
                  {selectedRows.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Selection Summary */}
              <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                {assignmentSummary.totalLeadAssigned > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1 text-sm text-blue-700">
                    <ApolloIcon name="user" className="h-4 w-4 text-blue-400" />
                    {assignmentSummary.totalLeadAssigned} assigned to Leads
                  </span>
                )}
                {assignmentSummary.totalOfferAssigned > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-green-50 px-3 py-1 text-sm text-green-700">
                    <ApolloIcon name="file" className="h-4 w-4 text-green-400" />
                    {assignmentSummary.totalOfferAssigned} assigned to Offers
                  </span>
                )}
                {assignmentSummary.totalUnassigned > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-3 py-1 text-sm text-gray-600">
                    <ApolloIcon name="file" className="h-4 w-4 text-gray-400" />
                    {assignmentSummary.totalUnassigned} unassigned
                  </span>
                )}
              </div>

              {/* Permanent Delete Option */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={permanentDelete}
                    onChange={(checked: any) => setPermanentDelete(checked)}
                  />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-amber-800">
                      Permanently delete files
                    </label>
                    <p className="text-xs text-amber-700">
                      Files will be permanently removed and cannot be recovered
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Options */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Choose an action:</p>

                {/* Case 1: Only Unassigned */}
                {!hasAssigned && hasUnassigned && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedDeleteAction('delete-only');
                      setDeleteStep('confirm');
                    }}
                    className="justify-start"
                    icon={<ApolloIcon name="trash" className="h-4 w-4" />}
                    size="xs"
                  >
                    Delete {selectedRows.length}
                    {selectedRows.length !== 1 ? 's' : ''}
                  </Button>
                )}

                {hasAssigned && !hasUnassigned && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedDeleteAction('unassign-delete');
                      setDeleteStep('confirm');
                    }}
                    className="justify-start"
                    icon={<ApolloIcon name="link" className="h-4 w-4" />}
                    size="xs"
                  >
                    Unassign and delete {selectedRows.length}
                  </Button>
                )}

                {hasAssigned && hasUnassigned && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setSelectedDeleteAction('unassign-delete');
                        setDeleteStep('confirm');
                      }}
                      className="justify-start"
                      icon={<ApolloIcon name="link" className="h-4 w-4" />}
                      size="xs"
                    >
                      Unassign and delete {selectedRows.length}
                    </Button>
                    <Button
                      variant="solid"
                      onClick={() => {
                        setSelectedDeleteAction('delete-unassigned');
                        setDeleteStep('confirm');
                      }}
                      className="justify-start"
                      icon={<ApolloIcon name="trash" className="h-4 w-4" />}    
                      size="xs"
                    >
                      Delete only Unassigned {assignmentSummary.totalUnassigned}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {deleteStep === 'confirm' && selectedDeleteAction && (
            <div className="space-y-0">
              <div className="relative text-center">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
                <div className="mt-2 flex items-center justify-center">
                  <Button
                    variant="plain"
                    onClick={() => setDeleteStep('choose')}
                    icon={<ApolloIcon name="arrow-left" className="h-4 w-4" />}
                    className="absolute top-0 left-0"
                    size="xs"
                  >
                    Back
                  </Button>
                </div>
              </div>

              {selectedDeleteAction === 'delete-only' && (
                <ConfirmationInput
                  confirmationText="DELETE"
                  onConfirm={async () => {
                    await handleDelete();
                  }}
                  onCancel={() => setDeleteStep('choose')}
                  buttonLabel="Confirm"
                  isLoading={bulkDeleteMutation.isPending}
                  description={`This will ${permanentDelete ? 'permanently ' : ''}delete ${selectedRows.length} unassigned document${selectedRows.length !== 1 ? 's' : ''}.`}
                />
              )}

              {selectedDeleteAction === 'unassign-delete' && (
                <ConfirmationInput
                  confirmationText="DELETE"
                  onConfirm={async () => {
                    await handleDelete(true);
                  }}
                  onCancel={() => setDeleteStep('choose')}
                  buttonLabel="Confirm"
                  isLoading={bulkDeleteMutation.isPending}
                  description={`This will unassign all assignments and ${permanentDelete ? 'permanently ' : ''}delete ${selectedRows.length} document${selectedRows.length !== 1 ? 's' : ''}.`}
                />
              )}

              {selectedDeleteAction === 'delete-unassigned' && (
                <ConfirmationInput
                  confirmationText="DELETE"
                  onConfirm={async () => {
                    await handleDelete(false, true);
                  }}
                  onCancel={() => setDeleteStep('choose')}
                  buttonLabel="Confirm"
                  isLoading={bulkDeleteMutation.isPending}
                  description={`This will ${permanentDelete ? 'permanently ' : ''}delete only the ${assignmentSummary.totalUnassigned} unassigned document${assignmentSummary.totalUnassigned !== 1 ? 's' : ''} from your selection.`}
                />
              )}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default DocumentDeleteModal;
