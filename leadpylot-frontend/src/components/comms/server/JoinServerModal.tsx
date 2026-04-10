'use client';

import { useState } from 'react';
import { useAcceptInvite } from '@/services/hooks/comm';
import { useCommStore } from '@/stores/commStore';
import { X, LogIn, Hash } from 'lucide-react';
import ModalPortal from '../shared/ModalPortal';

interface Props {
  onClose: () => void;
}

export default function JoinServerModal({ onClose }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const acceptInvite = useAcceptInvite();
  const setActiveServer = useCommStore((s) => s.setActiveServer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setError('');
    try {
      const server = await acceptInvite.mutateAsync(trimmed);
      setActiveServer(server.id);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Invalid or expired invite code';
      setError(msg);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[440px] rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/20">
            <LogIn size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-white/90">Join a Server</h2>
          <p className="mt-2 text-sm text-white/40">
            Enter an invite code to join an existing server
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/40">
            Invite Code <span className="text-red-400">*</span>
          </label>
          <div className="mb-1 flex items-center rounded-lg bg-white/[0.06] border border-white/[0.1] px-3">
            <Hash size={16} className="text-white/25" />
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              placeholder="e.g. c54b138b"
              className="w-full bg-transparent px-2 py-3 text-[15px] text-white/90 placeholder-white/20 outline-none"
              autoFocus
            />
          </div>

          {error && (
            <p className="mb-3 text-sm text-red-400">{error}</p>
          )}

          <p className="mb-4 text-xs text-white/30">
            Ask a server admin for an invite code. Codes look like <code className="rounded bg-white/[0.08] border border-white/[0.1] px-1.5 py-0.5 text-indigo-400">c54b138b</code>
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-white/[0.06] border border-white/[0.1] py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-white/[0.1] hover:text-white/90"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!code.trim() || acceptInvite.isPending}
              className="flex-1 rounded-lg bg-white/[0.1] backdrop-blur-xl border border-white/[0.15] py-2.5 text-sm font-medium text-white/90 transition-all hover:bg-white/[0.18] hover:border-white/[0.25] hover:shadow-lg hover:shadow-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {acceptInvite.isPending ? 'Joining...' : 'Join Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
