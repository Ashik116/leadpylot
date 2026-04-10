'use client';

import { Suspense } from 'react';
import CallWindowContent from './_components/CallWindowContent';

/**
 * Call Window Page
 * 
 * This is a standalone page that opens in a popup window
 * for handling VoIP calls. It maintains its own SIP connection
 * independent of the main application.
 * 
 * Benefits:
 * - Call survives main app refresh/navigation
 * - User can multitask while on call
 * - Clear visual separation of call UI
 */
export default function CallWindowPage() {
  return (
    <Suspense fallback={<CallWindowLoading />}>
      <CallWindowContent />
    </Suspense>
  );
}

function CallWindowLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
        <p className="text-slate-400">Initializing call...</p>
      </div>
    </div>
  );
}

