'use client';

import { useCommStore } from '@/stores/commStore';
import { useJoinCall, useUserProfiles } from '@/services/hooks/comm';
import { Phone, PhoneOff } from 'lucide-react';
import { motion } from 'framer-motion';
import ModalPortal from '../shared/ModalPortal';

export default function IncomingCallModal() {
  const { incomingCall, setIncomingCall, userProfiles } = useCommStore();
  const joinCall = useJoinCall();

  // Fetch profile for the caller
  const callerIds = incomingCall?.callerID ? [incomingCall.callerID] : [];
  useUserProfiles(callerIds);

  if (!incomingCall) return null;

  const callerProfile = userProfiles[incomingCall.callerID];
  const callerName = callerProfile?.username || incomingCall.callerID.slice(-6);

  const handleAccept = () => {
    joinCall.mutate({
      roomName: incomingCall.roomName,
      audio: incomingCall.audio,
      video: incomingCall.video,
    });
    setIncomingCall(null);
  };

  const handleDecline = () => {
    setIncomingCall(null);
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-[360px] rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] p-6 shadow-2xl text-center"
      >
        <div className="mb-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/20"
          >
            <Phone size={28} className="text-emerald-400" />
          </motion.div>
          <h3 className="text-lg font-bold text-white/90">Incoming {incomingCall.video ? 'Video' : 'Voice'} Call</h3>
          <p className="mt-1 text-sm text-white/40">
            {callerName} is calling...
          </p>
        </div>

        <div className="flex justify-center gap-6">
          <button
            onClick={handleDecline}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/80 text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-500 hover:scale-105"
          >
            <PhoneOff size={24} />
          </button>
          <button
            onClick={handleAccept}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/80 text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-500 hover:scale-105"
          >
            <Phone size={24} />
          </button>
        </div>
      </motion.div>
    </div>
    </ModalPortal>
  );
}
