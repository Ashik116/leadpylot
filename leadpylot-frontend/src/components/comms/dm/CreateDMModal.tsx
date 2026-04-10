'use client';

import { useState } from 'react';
import { useCreateDM } from '@/services/hooks/comm';
import { useCommStore } from '@/stores/commStore';
import { X } from 'lucide-react';
import ModalPortal from '../shared/ModalPortal';

interface Props {
  onClose: () => void;
}

export default function CreateDMModal({ onClose }: Props) {
  const [recipientId, setRecipientId] = useState('');
  const createDM = useCreateDM();
  const setActiveDM = useCommStore((s) => s.setActiveDM);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId.trim()) return;
    try {
      const conv = await createDM.mutateAsync(recipientId.trim());
      setActiveDM(conv.id);
      onClose();
    } catch (err) {
      console.error('Failed to create DM:', err);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[440px] rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white/90">New Direct Message</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors"><X size={20} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-4">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/40">User ID</label>
          <input
            type="text"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            placeholder="Enter user ID to message"
            className="mb-4 w-full rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2.5 text-[15px] text-white/90 placeholder-white/20 outline-none focus:border-indigo-500/50 transition-colors"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm text-white/60 hover:text-white/90 transition-colors">Cancel</button>
            <button type="submit" disabled={!recipientId.trim() || createDM.isPending} className="rounded-lg bg-white/[0.1] backdrop-blur-xl border border-white/[0.15] px-4 py-2.5 text-sm font-medium text-white/90 transition-all hover:bg-white/[0.18] hover:border-white/[0.25] hover:shadow-lg hover:shadow-indigo-500/10 disabled:opacity-40">
              {createDM.isPending ? 'Creating...' : 'Start Conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
