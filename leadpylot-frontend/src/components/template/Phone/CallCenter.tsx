import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Select from '@/components/ui/Select/Select';
import classNames from '@/utils/classNames';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CONNECT_STATUS, RegisterStatus, useSafeJsSIP, SessionState } from '@/hooks/useJsSIP';
import { CallSessionItem } from './CallSessionItem';
import { setAudioOutputDevice } from '@/services/audioService';
import { usePhoneUIStore } from '@/stores/phoneUIStore';
import { isDocument } from '@/utils/utils';
import CallKeypad from './CallKeypad';
import { useGlobalAdminSIP } from '@/hooks/useGlobalAdminSIP';

export const CallCenter = ({ callerId, hideActiveCall }: { callerId?: string; hideActiveCall?: boolean }) => {
  const { registerStatus, connectStatus, sessions } = useSafeJsSIP();
  const { isAdmin, isSipConnected, connectToSIP, disconnectFromSIP, adminCredentials } = useGlobalAdminSIP();

  const setPhoneUIState = usePhoneUIStore((s) => s.setPhoneUIState);
  const storedSelectedOutput = usePhoneUIStore((s) => s.selectedOutput);
  const storedSelectedRinging = usePhoneUIStore((s) => s.selectedRinging);

  const phoneNumber = isAdmin && isSipConnected ? (adminCredentials?.voip_username || callerId || '') : (callerId ?? '');
  const [outputDevices, setOutputDevices] = useState<{ label: string; value: string }[]>([]);
  const [inputDevices, setInputDevices] = useState<{ label: string; value: string }[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<string>(storedSelectedOutput);
  const [selectedRinging, setSelectedRinging] = useState<string>(storedSelectedRinging);
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isAudioSettingsExpanded, setIsAudioSettingsExpanded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicTesting, setIsMicTesting] = useState(false);

  const micTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const micTestStreamRef = useRef<MediaStream | null>(null);

  const hasActiveCalls =
    Object.keys(sessions)?.filter((key) => {
      const session = sessions[key];
      return ![SessionState?.Terminating, SessionState?.Terminated].includes(session?.state);
    })?.length > 0;

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current?.getTracks()?.forEach((track) => track?.stop());
      mediaStreamRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current?.disconnect();
      sourceNodeRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const stopMicTest = useCallback(() => {
    if (micTestAudioRef.current) {
      micTestAudioRef.current.pause();
      micTestAudioRef.current.srcObject = null;
      micTestAudioRef.current.remove();
      micTestAudioRef.current = null;
    }
    if (micTestStreamRef.current) {
      micTestStreamRef.current.getTracks().forEach((t) => t.stop());
      micTestStreamRef.current = null;
    }
    setIsMicTesting(false);
  }, []);

  const startMicTest = useCallback(async () => {
    stopMicTest();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedInput !== 'default' ? { deviceId: { exact: selectedInput } } : true,
      });
      micTestStreamRef.current = stream;

      const audioEl = document.createElement('audio');
      audioEl.srcObject = stream;
      audioEl.muted = false;
      audioEl.volume = 1.0;
      (audioEl as any).playsInline = true;
      document.body.appendChild(audioEl);
      micTestAudioRef.current = audioEl;

      // Route to selected speaker
      if (selectedOutput && selectedOutput !== 'default' && 'setSinkId' in audioEl) {
        await (audioEl as any).setSinkId(selectedOutput);
      }

      await audioEl.play();
      setIsMicTesting(true);
    } catch (err) {
      console.error('Mic test failed:', err);
      stopMicTest();
    }
  }, [selectedInput, selectedOutput, stopMicTest]);

  // Stop mic test when audio settings collapse or component unmounts
  useEffect(() => {
    if (!isAudioSettingsExpanded) stopMicTest();
  }, [isAudioSettingsExpanded, stopMicTest]);

  useEffect(() => () => stopMicTest(), [stopMicTest]);

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        await navigator?.mediaDevices?.getUserMedia({ audio: true });
        const devices = await navigator?.mediaDevices?.enumerateDevices();

        const outputs = devices
          ?.filter((d) => d?.kind === 'audiooutput')
          ?.map((d) => ({ label: d?.label || 'Default Speaker', value: d?.deviceId }));

        const inputs = devices
          ?.filter((d) => d?.kind === 'audioinput')
          ?.map((d) => ({ label: d?.label || 'Default Microphone', value: d?.deviceId }));

        if (!outputs?.some((d) => d?.value === 'default' || d?.label?.toLowerCase()?.includes('default')) && outputs?.length > 0) {
          outputs?.unshift({ label: 'Default Speaker', value: 'default' });
        }
        if (!inputs?.some((d) => d?.value === 'default' || d?.label?.toLowerCase()?.includes('default')) && inputs?.length > 0) {
          inputs?.unshift({ label: 'Default Microphone', value: 'default' });
        }

        setOutputDevices(outputs);
        setInputDevices(inputs);

        if (outputs?.length > 0) {
          const def = outputs?.find((d) => d?.value === 'default' || d?.value === '' || d?.label?.toLowerCase()?.includes('default'));
          const deviceId = def ? def.value : outputs[0].value;
          setSelectedOutput(deviceId);
          setSelectedRinging(deviceId);
          // Persist to store so JsSIPProvider can route call audio to the right device
          setPhoneUIState({ selectedOutput: deviceId, selectedRinging: deviceId });
          setAudioOutputDevice(deviceId);
        }
        if (inputs?.length > 0) {
          const def = inputs?.find((d) => d?.value === 'default' || d?.value === '' || d?.label?.toLowerCase()?.includes('default'));
          setSelectedInput(def ? def.value : inputs[0].value);
        }
      } catch {
        setOutputDevices([{ label: 'Default Speaker', value: 'default' }]);
        setInputDevices([{ label: 'Default Microphone', value: 'default' }]);
        setSelectedOutput('default');
        setSelectedRinging('default');
        setSelectedInput('default');
      }
    };
    getAudioDevices();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current?.getTracks()?.forEach((t) => t?.stop());
      if (sourceNodeRef.current) sourceNodeRef.current?.disconnect();
    };
  }, []);

  const startAudioLevelMonitoring = useCallback(async () => {
    try {
      stopAudioLevelMonitoring();
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const stream = await navigator?.mediaDevices?.getUserMedia({
        audio: { deviceId: selectedInput !== 'default' ? { exact: selectedInput } : undefined },
      });
      mediaStreamRef.current = stream;
      const source = audioContextRef.current?.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      sourceNodeRef.current = source;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setAudioLevel(Math.floor((sum / dataArray.length / 255) * 10));
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch {
      setAudioLevel(0);
    }
  }, [selectedInput, stopAudioLevelMonitoring]);

  useEffect(() => {
    if (selectedInput) startAudioLevelMonitoring();
    return () => stopAudioLevelMonitoring();
  }, [selectedInput, startAudioLevelMonitoring, stopAudioLevelMonitoring]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try { await connectToSIP(); } catch { /* silent */ } finally { setIsConnecting(false); }
  }, [connectToSIP]);

  const handleDisconnect = useCallback(async () => {
    try { await disconnectFromSIP(); } catch { /* silent */ }
  }, [disconnectFromSIP]);

  const selectStyles = {
    menuPortal: (base: any) => ({ ...base, zIndex: 99999, fontSize: '0.75rem' }),
    menu: (base: any) => ({ ...base, zIndex: 99999, fontSize: '0.75rem' }),
    control: (base: any) => ({ ...base, minHeight: '32px', borderColor: '#e5e7eb', '&:hover': { borderColor: '#d1d5db' } }),
    valueContainer: (base: any) => ({ ...base, padding: '0 8px' }),
    indicatorsContainer: (base: any) => ({ ...base, height: '32px' }),
  };

  // Get active session for display (exclude incoming calls - those go to popup)
  const activeSessionKeys = Object.keys(sessions)?.filter((key) => {
    const s = sessions[key];
    if ([SessionState?.Terminating, SessionState?.Terminated].includes(s?.state)) return false;
    if (s?.state === SessionState?.Initial || s?.state === SessionState?.Incoming) return false;
    return true;
  });
  const latestSessionKey = activeSessionKeys.length > 0 ? activeSessionKeys[activeSessionKeys.length - 1] : null;

  const isReady = connectStatus === CONNECT_STATUS?.CONNECTED && registerStatus === RegisterStatus?.REGISTERED;

  return (
    <div className="w-[420px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <ApolloIcon name="phone" className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">Phone</span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveCalls && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Active
            </span>
          )}
          <Tag
            prefix
            prefixClass={isReady ? 'bg-emerald-500' : connectStatus === CONNECT_STATUS?.DISCONNECTED ? 'bg-red-400' : 'bg-amber-400'}
            className="text-[10px]"
          >
            {isReady ? 'Ready' : connectStatus?.toLowerCase()?.replace(/_/g, ' ')}
          </Tag>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Extension display */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
          <div className="text-xs text-gray-500">{isAdmin ? 'Admin Extension' : 'Extension'}</div>
          <div className={classNames(
            'font-mono text-sm font-semibold',
            phoneNumber ? 'text-gray-900' : 'text-gray-400'
          )}>
            {phoneNumber || 'Not set'}
            {phoneNumber && <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 align-middle" />}
          </div>
        </div>

        {/* Admin SIP toggle */}
        {isAdmin && (
          <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <ApolloIcon name="shield" className="text-xs text-blue-500" />
              <span className="text-xs text-gray-600">Admin SIP</span>
            </div>
            {!isSipConnected ? (
              <Button size="xs" variant="solid" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            ) : (
              <Button size="xs" variant="default" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </div>
        )}

        {/* Active Call (hidden when incoming overlay is handling it) */}
        {latestSessionKey && !hideActiveCall && (
          <div className="overflow-hidden rounded-lg border-2 border-blue-200 bg-blue-50/50">
            <CallSessionItem key={latestSessionKey} sessionId={latestSessionKey} />
          </div>
        )}

        {/* Audio Settings (collapsible) */}
        <div className="rounded-lg border border-gray-100">
          <button
            className="flex w-full items-center justify-between px-3 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
            onClick={() => setIsAudioSettingsExpanded(!isAudioSettingsExpanded)}
          >
            <div className="flex items-center gap-2">
              <ApolloIcon name="cog" className="text-gray-400" />
              <span className="font-medium">Audio Settings</span>
              {audioLevel > 0 && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              )}
            </div>
            <ApolloIcon
              name="chevron-arrow-right"
              className={classNames('text-gray-400 transition-transform', isAudioSettingsExpanded ? 'rotate-90' : '')}
            />
          </button>

          {isAudioSettingsExpanded && (
            <div className="space-y-3 border-t border-gray-100 p-3">
              {/* Speaker */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-[11px] text-gray-500">Speaker</span>
                <div className="flex-1">
                  <Select
                    isSearchable={false}
                    value={outputDevices?.find((d) => d?.value === selectedOutput)}
                    onChange={(val: any) => {
                      if (val) { setSelectedOutput(val.value); setPhoneUIState({ selectedOutput: val.value }); setAudioOutputDevice(val.value); }
                    }}
                    styles={selectStyles}
                    menuPortalTarget={isDocument ? document?.body : null}
                    menuPosition="fixed"
                    options={outputDevices?.length > 0 ? outputDevices : [{ label: 'Permission required', value: '' }]}
                  />
                </div>
              </div>

              {/* Ringtone */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-[11px] text-gray-500">Ringtone</span>
                <div className="flex-1">
                  <Select
                    isSearchable={false}
                    value={outputDevices?.find((d) => d?.value === selectedRinging)}
                    onChange={(val: any) => {
                      if (val) { setSelectedRinging(val.value); setPhoneUIState({ selectedRinging: val.value }); }
                    }}
                    styles={selectStyles}
                    menuPortalTarget={isDocument ? document?.body : null}
                    menuPosition="fixed"
                    options={outputDevices?.length > 0 ? outputDevices : [{ label: 'Permission required', value: '' }]}
                  />
                </div>
              </div>

              {/* Microphone */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-[11px] text-gray-500">Microphone</span>
                <div className="flex-1">
                  <Select
                    isSearchable={false}
                    value={inputDevices?.find((d) => d?.value === selectedInput)}
                    onChange={(val: any) => val && setSelectedInput(val.value)}
                    styles={selectStyles}
                    menuPortalTarget={isDocument ? document?.body : null}
                    menuPosition="fixed"
                    options={inputDevices?.length > 0 ? inputDevices : [{ label: 'Permission required', value: '' }]}
                  />
                </div>
              </div>

              {/* Audio level bar */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-[11px] text-gray-500">Mic Level</span>
                <div className="flex flex-1 gap-0.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={classNames(
                        'h-1.5 flex-1 rounded-full transition-all',
                        i < audioLevel
                          ? i < 6 ? 'bg-emerald-400' : i < 8 ? 'bg-amber-400' : 'bg-red-400'
                          : 'bg-gray-200'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Mic playback test */}
              <div className="flex items-center gap-3">
                <span className="w-20 text-[11px] text-gray-500">Test Mic</span>
                <div className="flex flex-1 items-center gap-2">
                  <button
                    onClick={isMicTesting ? stopMicTest : startMicTest}
                    className={classNames(
                      'flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-medium transition-all',
                      isMicTesting
                        ? 'bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100'
                        : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
                    )}
                  >
                    <span className={classNames(
                      'h-1.5 w-1.5 rounded-full',
                      isMicTesting ? 'animate-pulse bg-red-500' : 'bg-gray-400'
                    )} />
                    {isMicTesting ? 'Stop Test' : 'Play back mic'}
                  </button>
                  {isMicTesting && (
                    <span className="text-[10px] text-amber-600">⚠️ You will hear yourself</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Keypad */}
        <CallKeypad />
      </div>
    </div>
  );
};
