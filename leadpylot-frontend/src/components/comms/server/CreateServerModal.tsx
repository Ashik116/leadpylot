'use client';

import { useState } from 'react';
import { useCreateServer } from '@/services/hooks/comm';
import { useCommStore } from '@/stores/commStore';
import { X } from 'lucide-react';
import ModalPortal from '../shared/ModalPortal';

interface Props {
  onClose: () => void;
}

export default function CreateServerModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createServer = useCreateServer();
  const setActiveServer = useCommStore((s) => s.setActiveServer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const server = await createServer.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      setActiveServer(server.id);
      onClose();
    } catch (err) {
      console.error('Failed to create server:', err);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[440px] rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white/90">Create a Server</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
              <X size={24} />
            </button>
          </div>
          <p className="mt-1 text-sm text-white/40">
            Your server is where you and your team hang out. Create one to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-4">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/40">
            Server Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Server"
            className="mb-4 w-full rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2.5 text-[15px] text-white/90 placeholder-white/20 outline-none focus:border-indigo-500/50 transition-colors"
            autoFocus
          />

          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/40">
            Description <span className="font-normal normal-case text-white/25">— Optional</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this server about?"
            rows={2}
            className="mb-4 w-full resize-none rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2.5 text-[15px] text-white/90 placeholder-white/20 outline-none focus:border-indigo-500/50 transition-colors"
          />

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white/90 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createServer.isPending}
              className="rounded-lg bg-white/[0.1] backdrop-blur-xl border border-white/[0.15] px-6 py-2.5 text-sm font-medium text-white/90 transition-all hover:bg-white/[0.18] hover:border-white/[0.25] hover:shadow-lg hover:shadow-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {createServer.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
