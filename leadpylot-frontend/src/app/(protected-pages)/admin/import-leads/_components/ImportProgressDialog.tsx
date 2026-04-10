'use client';

import Dialog from '@/components/ui/Dialog';
import Progress from '@/components/ui/Progress';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { ImportProgress } from '@/services/ImportSocketService';
import { useEffect, useState, useRef } from 'react';

interface ImportProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ImportProgress | null;
  isCompleted: boolean;
  isFailed: boolean;
  onDownloadFailed?: () => void;
  onNavigateToLeads?: () => void;
}

/**
 * Phase display configuration
 * Using valid ApolloIcon names
 */
const PHASE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  queued: { label: 'Queued', icon: 'hourglass', color: 'text-gray-500' },
  uploading: { label: 'Uploading File', icon: 'cloud-upload', color: 'text-blue-500' },
  validating: { label: 'Validating Data', icon: 'check-circle', color: 'text-blue-500' },
  enhancement_check: { label: 'Checking Enhancements', icon: 'search', color: 'text-blue-500' },
  stage_assignment: { label: 'Assigning Stages', icon: 'layer-group', color: 'text-blue-500' },
  agent_assignment: { label: 'Auto-assigning Agents', icon: 'user-plus', color: 'text-blue-500' },
  duplicate_check: { label: 'Duplicate Check', icon: 'copy', color: 'text-blue-500' },
  lookup_resolution: { label: 'Resolving References', icon: 'link', color: 'text-blue-500' },
  database_insertion: { label: 'Creating Leads', icon: 'server', color: 'text-green-500' },
  post_processing: { label: 'Post Processing', icon: 'cogs', color: 'text-green-500' },
  completed: { label: 'Completed', icon: 'check', color: 'text-green-600' },
  failed: { label: 'Failed', icon: 'times-circle', color: 'text-red-600' },
};

/**
 * Format time remaining
 */
function formatTimeRemaining(ms?: number): string {
  if (!ms || ms <= 0) return '';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `~${minutes}m ${remainingSeconds}s remaining`;
  }
  return `~${remainingSeconds}s remaining`;
}

export function ImportProgressDialog({
  isOpen,
  onClose,
  progress,
  isCompleted,
  isFailed,
  onDownloadFailed,
  onNavigateToLeads,
}: ImportProgressDialogProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Initialize start time when dialog opens
  useEffect(() => {
    if (isOpen && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
    if (!isOpen) {
      startTimeRef.current = null;
    }
  }, [isOpen]);

  // Track elapsed time
  useEffect(() => {
    if (!isOpen || isCompleted || isFailed) {
      return;
    }

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isCompleted, isFailed]);

  const phaseConfig = progress?.phase ? PHASE_CONFIG[progress.phase] : PHASE_CONFIG.queued;
  const percentage = progress?.percentage || 0;

  // Format elapsed time
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={isCompleted || isFailed ? onClose : undefined}
      width={500}
      closable={isCompleted || isFailed}
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className={`mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full ${
            isCompleted ? 'bg-green-100' : isFailed ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            <ApolloIcon 
              name={phaseConfig.icon as any} 
              className={`text-2xl ${phaseConfig.color}`} 
            />
          </div>
          <h3 className="text-lg font-semibold">
            {isCompleted ? 'Import Complete!' : isFailed ? 'Import Failed' : 'Importing Leads...'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {progress?.description || 'Preparing import...'}
          </p>
        </div>

        {/* Progress Bar */}
        {!isCompleted && !isFailed && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">{phaseConfig.label}</span>
              <span className="font-medium">{Math.round(percentage)}%</span>
            </div>
            <Progress percent={percentage} />
            
            {/* Additional Info */}
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>
                {progress?.processedCount !== undefined && progress?.totalRows
                  ? `${progress.processedCount.toLocaleString()} / ${progress.totalRows.toLocaleString()} leads`
                  : progress?.processedCount !== undefined
                  ? `${progress.processedCount.toLocaleString()} leads processed`
                  : ''}
              </span>
              <span>{formatTimeRemaining(progress?.estimatedTimeRemaining)}</span>
            </div>
          </div>
        )}

        {/* Elapsed Time */}
        {!isCompleted && !isFailed && (
          <div className="text-center text-sm text-gray-500 mb-4">
            Elapsed: {formatElapsedTime(elapsedTime)}
          </div>
        )}

        {/* Completed Results */}
        {isCompleted && progress?.result && (
          <div className="mb-6">
            {/* Main Stats Grid - 2x2 layout matching the original dialog */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* New Leads */}
              <div className="bg-green-50 hover:bg-green-100/50 border border-green-200/30 rounded-xl px-5 py-4 text-center shadow-sm transition-all duration-300">
                <p className="text-2xl font-bold text-green-600 mb-1">
                  {progress.result.duplicateStatusSummary?.new?.toLocaleString() || 
                   progress.result.successCount.toLocaleString()}
                </p>
                <p className="text-sm text-green-700">New Leads</p>
              </div>
              
              {/* Failed */}
              <div className="bg-red-50 hover:bg-red-100/50 border border-red-200/30 rounded-xl px-5 py-4 text-center shadow-sm transition-all duration-300">
                <p className="text-2xl font-bold text-red-600 mb-1">
                  {progress.result.failureCount.toLocaleString()}
                </p>
                <p className="text-sm text-red-700">Failed to Import</p>
              </div>
              
              {/* Duplicate (10-week) */}
              <div className="bg-amber-50 hover:bg-amber-100/50 border border-amber-200/30 rounded-xl px-5 py-4 text-center shadow-sm transition-all duration-300">
                <p className="text-2xl font-bold text-amber-700 mb-1">
                  {progress.result.duplicateStatusSummary?.duplicate?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-amber-800/80">Duplicate</p>
              </div>
              
              {/* Old Duplicate (10+ weeks) */}
              <div className="bg-rose-50 hover:bg-rose-100/50 border border-rose-200/30 rounded-xl px-5 py-4 text-center shadow-sm transition-all duration-300">
                <p className="text-2xl font-bold text-rose-600 mb-1">
                  {progress.result.duplicateStatusSummary?.oldDuplicate?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-rose-700/80">10 Week Duplicate</p>
              </div>
            </div>

            {/* Additional Stats */}
            {(progress.result.enhancedCount || progress.result.autoAssignedCount) && (
              <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {progress.result.enhancedCount !== undefined && progress.result.enhancedCount > 0 && (
                  <p>• {progress.result.enhancedCount.toLocaleString()} leads enhanced</p>
                )}
                {progress.result.autoAssignedCount !== undefined && progress.result.autoAssignedCount > 0 && (
                  <p>• {progress.result.autoAssignedCount.toLocaleString()} leads auto-assigned</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Failed Message */}
        {isFailed && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                {progress?.error || 'An error occurred during the import. Please try again.'}
              </p>
            </div>
          </div>
        )}

        {/* Warning about not closing */}
        {!isCompleted && !isFailed && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-700 text-center">
              ⚠️ Please don&apos;t close this window or navigate away during import.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-3">
          {isCompleted && (
            <>
              {progress?.result?.downloadLink && progress.result.failureCount > 0 && (
                <Button
                  variant="solid"
                  color="ocean"
                  onClick={onDownloadFailed}
                  icon={<ApolloIcon name="download" className="mr-1" />}
                >
                  Download Failed Records
                </Button>
              )}
              <Button
                variant={progress?.result?.downloadLink ? 'plain' : 'solid'}
                onClick={onNavigateToLeads}
              >
                View Pending Leads
              </Button>
            </>
          )}
          
          {isFailed && (
            <Button variant="solid" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

export default ImportProgressDialog;
