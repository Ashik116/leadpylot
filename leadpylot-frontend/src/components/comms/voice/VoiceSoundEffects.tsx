'use client';

import { useEffect, useRef } from 'react';
import { useParticipants } from '@livekit/components-react';
import type { Participant } from 'livekit-client';

/**
 * Invisible component that plays Discord-style notification sounds when:
 * - A participant joins the voice channel
 * - A participant leaves the voice channel
 * - A participant starts screen sharing
 * - A participant stops screen sharing
 *
 * Uses the Web Audio API for short synthetic tones (no external audio files needed).
 * Must be rendered inside <LiveKitRoom>.
 */

// ---- Web Audio API sound generator ----

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browsers require user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

// Discord-style sounds using dual tones
function playJoinSound() {
  // Rising two-note chime (like Discord's join)
  playTone(800, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(1000, 0.15, 'sine', 0.1), 100);
}

function playLeaveSound() {
  // Falling two-note chime (like Discord's leave)
  playTone(600, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(400, 0.18, 'sine', 0.08), 100);
}

function playStreamStartSound() {
  // Bright ascending triple chime
  playTone(700, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(900, 0.1, 'sine', 0.1), 80);
  setTimeout(() => playTone(1200, 0.15, 'sine', 0.08), 160);
}

function playStreamEndSound() {
  // Soft descending double tone
  playTone(800, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(500, 0.2, 'sine', 0.06), 100);
}

// ---- Component ----

export default function VoiceSoundEffects() {
  const participants = useParticipants();
  const prevParticipantsRef = useRef<Set<string>>(new Set());
  const prevScreenSharersRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip sounds on initial mount (don't play join sounds for everyone already in the room)
    if (!mountedRef.current) {
      const ids = new Set(participants.map((p) => p.identity));
      const streamers = new Set(participants.filter((p) => p.isScreenShareEnabled).map((p) => p.identity));
      prevParticipantsRef.current = ids;
      prevScreenSharersRef.current = streamers;
      mountedRef.current = true;
      return;
    }

    const currentIds = new Set(participants.map((p) => p.identity));
    const currentStreamers = new Set(
      participants.filter((p) => p.isScreenShareEnabled).map((p) => p.identity),
    );
    const prevIds = prevParticipantsRef.current;
    const prevStreamers = prevScreenSharersRef.current;

    // Detect joins (in current but not in previous)
    currentIds.forEach((id) => {
      if (!prevIds.has(id)) {
        playJoinSound();
      }
    });

    // Detect leaves (in previous but not in current)
    prevIds.forEach((id) => {
      if (!currentIds.has(id)) {
        playLeaveSound();
      }
    });

    // Detect stream starts
    currentStreamers.forEach((id) => {
      if (!prevStreamers.has(id)) {
        playStreamStartSound();
      }
    });

    // Detect stream ends
    prevStreamers.forEach((id) => {
      if (!currentStreamers.has(id)) {
        playStreamEndSound();
      }
    });

    prevParticipantsRef.current = currentIds;
    prevScreenSharersRef.current = currentStreamers;
  }, [participants]);

  return null; // Invisible component
}
