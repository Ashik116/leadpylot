'use client';

import { useState } from 'react';
import { useServer, useUpdateServer, useDeleteServer } from '@/services/hooks/comm';
import { useCommStore } from '@/stores/commStore';
import { X, Trash2 } from 'lucide-react';
import ModalPortal from '../shared/ModalPortal';

interface Props {
  serverId: string;
  onClose: () => void;
}

export default function ServerSettings({ serverId, onClose }: Props) {
  const { data: serverInfo } = useServer(serverId);
  const server = serverInfo?.server;
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const setActiveServer = useCommStore((s) => s.setActiveServer);

  const [name, setName] = useState(server?.name || '');
  const [description, setDescription] = useState(server?.description || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    await updateServer.mutateAsync({ serverId, data: { name, description } });
    onClose();
  };

  const handleDelete = async () => {
    await deleteServer.mutateAsync(serverId);
    setActiveServer(null);
    onClose();
  };

  if (!server) return null;

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[500px] rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
          <h2 className="text-lg font-bold text-white/90">Server Settings</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/40">Server Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2.5 text-[15px] text-white/90 outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-white/40">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2.5 text-[15px] text-white/90 outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 transition-all">
                  <Trash2 size={14} /> Delete Server
                </button>
              ) : (
                <button onClick={handleDelete} className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/30 transition-all">
                  Confirm Delete
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white/90 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={updateServer.isPending} className="rounded-lg bg-white/[0.1] backdrop-blur-xl border border-white/[0.15] px-4 py-2 text-sm font-medium text-white/90 transition-all hover:bg-white/[0.18] hover:border-white/[0.25] hover:shadow-lg hover:shadow-indigo-500/10 disabled:opacity-40">
                {updateServer.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
