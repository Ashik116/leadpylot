'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSafeJsSIP, SessionState } from '@/hooks/useJsSIP';

import { Role } from '@/configs/navigation.config/auth.route.config';
import { useGlobalAdminSIP } from '@/hooks/useGlobalAdminSIP';
import { useSession } from '@/hooks/useSession';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface SupervisorAudioControlsProps {
  onDeviceChange?: (inputId: string, outputId: string) => void;
  hidden?: boolean;
}

export const SupervisorAudioControls: React.FC<SupervisorAudioControlsProps> = ({
  onDeviceChange,
  hidden = false,
}) => {
  const { data: session } = useSession();
  const { sessions } = useSafeJsSIP();

  // Use global admin SIP connection
  const { isSipConnected: globalSipConnected, voipServerInfo } = useGlobalAdminSIP();

  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [selectedOutput, setSelectedOutput] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSupervision, setActiveSupervision] = useState<string | null>(null);

  // Use global SIP connection status instead of local state
  const sipConnected = globalSipConnected;

  // Note: VoIP server and SIP connection now handled globally by useGlobalAdminSIP

  // Get available audio devices
  const getAudioDevices = useCallback(async () => {
    try {
      setIsLoading(true);

      // Request permission to access media devices
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Stop the stream immediately after getting permission
      stream.getTracks().forEach((track) => track.stop());

      // Get list of devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices
        .filter((device) => device.kind === 'audioinput' && device.label)
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
        }));

      const audioOutputs = devices
        .filter((device) => device.kind === 'audiooutput' && device.label)
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`,
        }));

      setInputDevices(audioInputs);
      setOutputDevices(audioOutputs);

      // Auto-select first device if none selected
      if (!selectedInput && audioInputs.length > 0) {
        setSelectedInput(audioInputs[0].deviceId);
      }
      if (!selectedOutput && audioOutputs.length > 0) {
        setSelectedOutput(audioOutputs[0].deviceId);
      }

      setPermissionGranted(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error accessing audio devices:', error);
      setPermissionGranted(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInput, selectedOutput]);

  // Auto-request audio permissions for admin users on mount
  useEffect(() => {
    const autoSetupAudio = async () => {
      if (session?.user?.role === Role.ADMIN && !permissionGranted) {
        await getAudioDevices();
      }
    };

    autoSetupAudio();
  }, [session?.user?.role, permissionGranted, getAudioDevices]);

  // Auto-answer supervisor calls (spy/whisper/barge)
  const lastIncomingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sipConnected || !sessions) return;

    const keys = Object.keys(sessions);
    if (keys.length === 0) return;

    const lastValue = sessions[keys[keys.length - 1]];
    const isIncoming = lastValue && lastValue.state === SessionState.Initial;

    if (isIncoming && lastValue.id !== lastIncomingIdRef.current) {
      lastIncomingIdRef.current = lastValue.id;

      // Check if this is a supervisor call by examining the remote URI
      const remoteUri = lastValue.remoteIdentity?.uri?.user || '';
      const remoteDisplay = lastValue.remoteIdentity?.displayName || '';
      const fullUri = lastValue.remoteIdentity?.uri?.toString() || '';

      // Enhanced supervisor call detection
      const isSupervisorCall =
        remoteUri.startsWith('*2221') || // Spy
        remoteUri.startsWith('*2222') || // Whisper
        remoteUri.startsWith('*2223') || // Barge
        remoteUri.startsWith('*2220') || // Scan
        remoteUri.includes('spy') ||
        remoteUri.includes('whisper') ||
        remoteUri.includes('barge') ||
        remoteDisplay.includes('spy') ||
        remoteDisplay.includes('whisper') ||
        remoteDisplay.includes('barge') ||
        fullUri.includes('*222') ||
        // Admin's own extension calling itself = supervisor call
        (session?.user?.voip_extension && remoteUri === session.user.voip_extension && session?.user?.role === Role.ADMIN);

      // eslint-disable-next-line no-console
      console.log('🔍 SupervisorAudioControls - Incoming call detected:', {
        sessionId: lastValue.id,
        state: lastValue.state,
        remoteUri,
        remoteDisplay,
        fullUri,
        remoteIdentity: lastValue.remoteIdentity,
        isSupervisorCall,
      });

      // Auto-answer supervisor calls
      if (isSupervisorCall) {
        // eslint-disable-next-line no-console
        console.log(
          '🎧 SupervisorAudioControls - Auto-answering supervisor call:',
          lastValue.id,
          'Pattern:',
          remoteUri
        );

        // Add small delay to ensure call is ready to be answered
        setTimeout(() => {
          (lastValue as any)
            .accept()
            .then(() => {
              // eslint-disable-next-line no-console
              console.log('✅ SupervisorAudioControls - Supervisor call answered successfully');

              // Determine supervision type based on timing (since feature code is stripped)
              const supervisionType =
                (session?.user?.voip_extension && remoteUri === session.user.voip_extension)
                  ? 'Supervisor session active (spy/whisper/barge)'
                  : `Supervisor session active (${remoteUri})`;
              setActiveSupervision(supervisionType);
            })
            .catch((error: any) => {
              // eslint-disable-next-line no-console
              console.error(
                '❌ SupervisorAudioControls - Failed to answer supervisor call:',
                error
              );
            });
        }, 200);
      } else {
        // eslint-disable-next-line no-console
        console.log(
          '📞 SupervisorAudioControls - Non-supervisor call detected, ignoring:',
          remoteUri
        );
      }
    }

    // Monitor call states and cleanup
    Object.values(sessions).forEach((session: any) => {
      if (session.state === SessionState.Terminated) {
        if (session.id === lastIncomingIdRef.current) {
          setActiveSupervision(null);
          lastIncomingIdRef.current = null;
        }
      } else if (session.state === SessionState.Established) {
        if (session.id === lastIncomingIdRef.current) {
          const remoteUri = session.remoteIdentity?.uri?.user || '';
          setActiveSupervision(`Supervisor session active (${remoteUri})`);
        }
      }
    });
  }, [sipConnected, sessions, session?.user?.role]);

  // Handle device selection changes
  const handleInputChange = useCallback(
    (deviceId: string) => {
      setSelectedInput(deviceId);
      onDeviceChange?.(deviceId, selectedOutput);
    },
    [selectedOutput, onDeviceChange]
  );

  const handleOutputChange = useCallback(
    (deviceId: string) => {
      setSelectedOutput(deviceId);
      onDeviceChange?.(selectedInput, deviceId);
    },
    [selectedInput, onDeviceChange]
  );

  // Auto-request permissions for admin users
  const handleRequestPermissions = useCallback(async () => {
    await getAudioDevices();
  }, [getAudioDevices]);

  // Return null if hidden
  if (hidden) {
    return null;
  }

  // Only show for admin users
  if (session?.user?.role !== Role.ADMIN) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <div className="p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ApolloIcon name="volume" className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Supervisor Audio</h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Global SIP Status */}
            <Tag
              className={`text-xs ${
                sipConnected
                  ? 'border-green-200 bg-green-100 text-green-800'
                  : 'border-gray-200 bg-gray-100 text-gray-600'
              }`}
            >
              {sipConnected ? '✅ SIP Connected' : '❌ SIP Disconnected'}
            </Tag>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2"
            >
              <ApolloIcon name={isExpanded ? 'minus' : 'plus'} className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SIP Connection Status */}
        <div className="mb-3">
          <div className="text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span
                className={`h-2 w-2 rounded-full ${sipConnected ? 'bg-green-500' : 'bg-gray-400'}`}
              />
              <span>
                {sipConnected ? 'SIP Connection: Connected' : 'SIP Connection: Disconnected'}
              </span>
            </div>

            {sipConnected && voipServerInfo && (
              <div className="mt-1 ml-4 text-xs text-gray-500">
                Extension 1001 ready for supervisor calls
              </div>
            )}
          </div>
        </div>

        {/* Active Supervision Status */}
        {activeSupervision && (
          <div className="mb-3 rounded-lg border border-purple-200 bg-purple-100 p-2">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
              <span className="text-sm font-medium text-purple-800">{activeSupervision}</span>
            </div>
          </div>
        )}

        {/* Expanded Controls */}
        {isExpanded && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            {/* Permission Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ApolloIcon
                  name={permissionGranted ? 'check' : 'x'}
                  className={`h-4 w-4 ${permissionGranted ? 'text-green-600' : 'text-red-600'}`}
                />
                <span className="text-sm text-gray-700">
                  Audio Permissions: {permissionGranted ? 'Granted' : 'Required'}
                </span>
              </div>

              {!permissionGranted && (
                <Button
                  size="sm"
                  onClick={handleRequestPermissions}
                  disabled={isLoading}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  {isLoading ? 'Requesting...' : 'Grant Access'}
                </Button>
              )}
            </div>

            {/* Device Selection */}
            {permissionGranted && (
              <>
                {/* Microphone Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Microphone</label>
                  <select
                    value={selectedInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2"
                  >
                    {inputDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speaker Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Speaker/Headphones</label>
                  <select
                    value={selectedOutput}
                    onChange={(e) => handleOutputChange(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2"
                  >
                    {outputDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Test Audio Button */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    // Test audio playback
                    const audio = new Audio(
                      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj'
                    );
                    // eslint-disable-next-line no-console
                    audio.play().catch(console.error);
                  }}
                  className="w-full"
                >
                  <ApolloIcon name="volume" className="mr-2 h-4 w-4" />
                  Test Audio
                </Button>
              </>
            )}

            {/* Info Notice */}
            <div className="rounded border bg-gray-50 p-2 text-xs text-gray-500">
              <div className="mb-1 font-medium">ℹ️ Supervisor Mode</div>
              <div>
                Extension 1001 is configured for supervisor monitoring. Audio devices will be used
                for spy/whisper/barge calls.
              </div>
            </div>
          </div>
        )}

        {/* Note about global connection */}
        <div className="mt-3 text-center text-xs text-gray-500">
          SIP connection is managed globally - supervision available throughout the application
        </div>
      </div>
    </Card>
  );
};
