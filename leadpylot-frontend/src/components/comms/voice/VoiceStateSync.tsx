'use client';

import { useEffect, useRef } from 'react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { Track, RemoteTrackPublication } from 'livekit-client';
import { useCommStore } from '@/stores/commStore';

/**
 * Invisible component that syncs LiveKit local participant state
 * (mute/deafen/camera/screen share) with the Zustand store, and vice versa.
 * Must be rendered inside <LiveKitRoom>.
 */
export default function VoiceStateSync() {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const {
    localMuted, localDeafened, setLocalMuted,
    pendingCameraToggle, pendingScreenShareToggle,
    clearPendingCameraToggle, clearPendingScreenShareToggle,
    setLocalCameraOn, setLocalScreenShareOn,
  } = useCommStore();
  const syncingRef = useRef(false);
  const initializedRef = useRef(false);

  // Mark as initialized after a short delay so Store->LiveKit sync wins on mount
  useEffect(() => {
    const t = setTimeout(() => { initializedRef.current = true; }, 2000);
    return () => clearTimeout(t);
  }, []);

  // Store -> LiveKit: when store mute changes, apply to LiveKit microphone
  useEffect(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const syncMute = async () => {
      try {
        const isCurrentlyMuted = !localParticipant.isMicrophoneEnabled;
        if (localMuted !== isCurrentlyMuted) {
          await localParticipant.setMicrophoneEnabled(!localMuted);
        }
      } catch {
        // Permission denied or unavailable
      }
      syncingRef.current = false;
    };
    syncMute();
  }, [localMuted, localParticipant]);

  // Store -> LiveKit: when deafen changes, mute/unmute all remote audio tracks
  useEffect(() => {
    for (const p of participants) {
      if (p.isLocal) continue;
      const audioPub = p.getTrackPublication(Track.Source.Microphone);
      if (audioPub && audioPub instanceof RemoteTrackPublication) {
        audioPub.setEnabled(!localDeafened);
      }
    }
  }, [localDeafened, participants]);

  // Handle pending camera toggle request (from sidebar buttons outside LiveKitRoom)
  useEffect(() => {
    if (!pendingCameraToggle) return;
    clearPendingCameraToggle();

    const toggle = async () => {
      try {
        const isOn = localParticipant.isCameraEnabled;
        // Let room publishDefaults handle resolution + simulcast layers
        await localParticipant.setCameraEnabled(!isOn);
        setLocalCameraOn(!isOn);
      } catch { /* permission denied */ }
    };
    toggle();
  }, [pendingCameraToggle, localParticipant, clearPendingCameraToggle, setLocalCameraOn]);

  // Handle pending screen share toggle request (from sidebar buttons outside LiveKitRoom)
  useEffect(() => {
    if (!pendingScreenShareToggle) return;
    clearPendingScreenShareToggle();

    const toggle = async () => {
      try {
        const isOn = localParticipant.isScreenShareEnabled;
        // Let room publishDefaults handle resolution + simulcast layers
        await localParticipant.setScreenShareEnabled(!isOn);
        setLocalScreenShareOn(!isOn);
      } catch { /* permission denied or user cancelled */ }
    };
    toggle();
  }, [pendingScreenShareToggle, localParticipant, clearPendingScreenShareToggle, setLocalScreenShareOn]);

  // Sync LiveKit camera/screen share state back to store
  useEffect(() => {
    const syncState = () => {
      const store = useCommStore.getState();
      const cameraOn = localParticipant.isCameraEnabled;
      const screenOn = localParticipant.isScreenShareEnabled;
      if (cameraOn !== store.localCameraOn) setLocalCameraOn(cameraOn);
      if (screenOn !== store.localScreenShareOn) setLocalScreenShareOn(screenOn);
    };

    const handler = () => {
      if (syncingRef.current) return;
      // Skip LiveKit→Store sync during initial mount to avoid overwriting user's intent
      if (!initializedRef.current) return;
      // Sync mute
      const isMuted = !localParticipant.isMicrophoneEnabled;
      if (isMuted !== useCommStore.getState().localMuted) {
        setLocalMuted(isMuted);
      }
      // Sync camera & screen share
      syncState();
    };

    localParticipant.on('trackMuted', handler);
    localParticipant.on('trackUnmuted', handler);
    localParticipant.on('localTrackPublished', handler);
    localParticipant.on('localTrackUnpublished', handler);

    return () => {
      localParticipant.off('trackMuted', handler);
      localParticipant.off('trackUnmuted', handler);
      localParticipant.off('localTrackPublished', handler);
      localParticipant.off('localTrackUnpublished', handler);
    };
  }, [localParticipant, setLocalMuted, setLocalCameraOn, setLocalScreenShareOn]);

  // Sync ALL participants' media states to the store (for sidebar indicators)
  useEffect(() => {
    const states: Record<string, { muted: boolean; camera: boolean; screen: boolean }> = {};
    for (const p of participants) {
      states[p.identity] = {
        muted: !p.isMicrophoneEnabled,
        camera: p.isCameraEnabled,
        screen: p.isScreenShareEnabled,
      };
    }
    useCommStore.getState().setVoiceMediaStates(states);
  }, [participants, participants.map((p) => `${p.identity}:${p.isMicrophoneEnabled}:${p.isCameraEnabled}:${p.isScreenShareEnabled}`).join(',')]);

  return null; // Invisible component
}
