'use client';

import { useState } from 'react';
import { useCreateChannel } from '@/services/hooks/comm';
import { useCommStore } from '@/stores/commStore';
import { X, Hash, Volume2, Video } from 'lucide-react';
import type { ChannelType } from '@/types/comm.types';
import ModalPortal from '../shared/ModalPortal';

interface Props {
  serverId: string;
  onClose: () => void;
}

const channelTypes: { type: ChannelType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'text', label: 'Text', icon: <Hash size={20} />, desc: 'Send messages, images, and files' },
  { type: 'voice', label: 'Voice', icon: <Volume2 size={20} />, desc: 'Voice chat with your team' },
  { type: 'video', label: 'Video', icon: <Video size={20} />, desc: 'Video calls and screen sharing' },
];

export default function CreateChannelModal({ serverId, onClose }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('text');
  const [topic, setTopic] = useState('');
  const createChannel = useCreateChannel();
  const setActiveChannel = useCommStore((s) => s.setActiveChannel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const channel = await createChannel.mutateAsync({
        serverId,
        data: { name: name.trim().toLowerCase().replace(/\s+/g, '-'), type, topic: topic.trim() || undefined },
      });
      setActiveChannel(channel.id);
      onClose();
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[460px] rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white/90">Create Channel</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors"><X size={20} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-4">
          {/* Channel Type */}
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/40">Channel Type</label>
          <div className="mb-4 space-y-1">
            {channelTypes.map((ct) => (
              <button
                key={ct.type}
                type="button"
                onClick={() => setType(ct.type)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                  type === ct.type
                    ? 'bg-white/[0.12] border border-white/[0.15] text-white/90 shadow-sm'
                    : 'bg-white/[0.04] border border-transparent text-white/50 hover:bg-white/[0.08]'
                }`}
              >
                <span className={type === ct.type ? 'text-white/90' : 'text-white/40'}>{ct.icon}</span>
                <div>
                  <p className="text-sm font-medium">{ct.label}</p>
                  <p className="text-xs text-white/30">{ct.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Channel Name */}
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/40">Channel Name</label>
          <div className="mb-4 flex items-center rounded-lg bg-white/[0.06] border border-white/[0.1] px-3">
            {type === 'text' ? <Hash size={16} className="text-white/25" /> : <Volume2 size={16} className="text-white/25" />}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="new-channel"
              className="w-full bg-transparent px-1 py-2.5 text-[15px] text-white/90 placeholder-white/20 outline-none"
              autoFocus
            />
          </div>

          {/* Topic (for text channels) */}
          {type === 'text' && (
            <>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/40">
                Topic <span className="font-normal normal-case text-white/25">— Optional</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What's this channel about?"
                className="mb-4 w-full rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2.5 text-[15px] text-white/90 placeholder-white/20 outline-none focus:border-indigo-500/50 transition-colors"
              />
            </>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm text-white/60 hover:text-white/90 transition-colors">Cancel</button>
            <button type="submit" disabled={!name.trim() || createChannel.isPending} className="rounded-lg bg-white/[0.1] backdrop-blur-xl border border-white/[0.15] px-4 py-2.5 text-sm font-medium text-white/90 transition-all hover:bg-white/[0.18] hover:border-white/[0.25] hover:shadow-lg hover:shadow-indigo-500/10 disabled:opacity-40">
              {createChannel.isPending ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
