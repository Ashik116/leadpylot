'use client';

import { useCommStore } from '@/stores/commStore';
import VoiceControls from './VoiceControls';
import { Phone, X } from 'lucide-react';
import ModalPortal from '../shared/ModalPortal';

export default function PersonalCall() {
  const { voiceRoomToken, voiceRoomUrl, voiceRoomName, clearVoice } = useCommStore();

  if (!voiceRoomToken || !voiceRoomName?.startsWith('dm_')) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[480px] rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
            <Phone size={18} className="text-emerald-400" />
            Personal Call
          </h2>
          <button onClick={clearVoice} className="text-white/40 hover:text-white/80 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20">
            <Phone size={32} className="text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            Connected
          </div>
        </div>

        <VoiceControls />
      </div>
    </div>
    </ModalPortal>
  );
}
