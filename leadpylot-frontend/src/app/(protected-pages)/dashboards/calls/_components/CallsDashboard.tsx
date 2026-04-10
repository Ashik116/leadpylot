'use client';

import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { type EnhancedCallData } from '@/services/CDRService';
import { AudioPlayer } from './AudioPlayer';
import CallsHistoryTable from './CallsHistory/CallsHistoryTable';
import { LiveMonitoringDashboard } from './LiveMonitoringDashboard';
import SupervisorActionHistory from './SupervisorActionHistory';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export const CallsDashboard = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'calls' | 'supervisor-actions'>('calls');
  useSetBackUrl(pathname);

  const [isRecordingDialogOpen, setIsRecordingDialogOpen] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<{
    url: string;
    title?: string;
    uniqueId: string;
  } | null>(null);

  // Handle opening the recording dialog
  const handleOpenRecordingDialog = (call: EnhancedCallData) => {
    if (!call.recordingUrls) {
      return;
    }

    const mp3Url = call.recordingUrls.mp3;

    setCurrentRecording({
      url: mp3Url,
      title: `Call Recording - ${call.destination}`,
      uniqueId: call.uniqueId,
    });
    setIsRecordingDialogOpen(true);
  };

  // Columns moved into CallsHistoryTable

  return (
    <div className="space-y-6 px-2 xl:px-4 text-sm">
      <LiveMonitoringDashboard setActiveTab={setActiveTab} activeTab={activeTab} />
      {/* Header Tabs*/}

      {/* Conditional Content Based on Tab */}

      {activeTab === 'supervisor-actions' && session?.user?.role === Role.ADMIN ? (
        <SupervisorActionHistory />
      ) : (
        <CallsHistoryTable onPlayRecording={(row) => handleOpenRecordingDialog(row)} />
      )}
      {/* Live Monitoring Dashboard (Admin Only) */}
      {/* Enhanced Recording Dialog */}
      <Dialog
        isOpen={isRecordingDialogOpen}
        onClose={() => setIsRecordingDialogOpen(false)}
        width={800}
      >
        <div className="p-6">
          {currentRecording && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium text-gray-900">
                    {currentRecording?.title || 'Call Recording'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Call ID: {currentRecording?.uniqueId || 'Unknown'}
                  </p>
                </div>
              </div>

              <AudioPlayer
                src={currentRecording?.url || ''}
                title={currentRecording?.title || 'Call Recording'}
                onError={() => {
                  // Audio playback error handled by component
                }}
              />

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (currentRecording?.url) {
                      const link = document.createElement('a');
                      link.href = currentRecording.url;
                      link.download = `call-recording-${currentRecording.uniqueId}.mp3`;
                      link.click();
                    }
                  }}
                  icon={<ApolloIcon name="download" />}
                >
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
