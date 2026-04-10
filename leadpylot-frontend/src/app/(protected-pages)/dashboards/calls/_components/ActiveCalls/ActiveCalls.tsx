"use client";
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ApolloIcon from "@/components/ui/ApolloIcon";
import { useSupervisorActions } from "@/services/hooks/useSupervisorActions";
import React, { useRef, useState } from "react";
import dayjs from "dayjs";
import WhisperCallModal from "./WhisperCallModal";
import SupervisorControls from "../SupervisorControls";

type TActiveCallsProps = {
    data: any[];
    refetchActiveCalls: () => void;
    refetchAgentStatus: () => void;
    isLoadingCalls: boolean;
    isLoadingAgents: boolean;
    isAdmin: boolean;
    selectedProject: any;
}
const formatDuration = (seconds: number) => {
    return dayjs.duration(seconds, 'seconds').format('mm:ss');
};
const ActiveCalls = ({ data, refetchActiveCalls, refetchAgentStatus, isLoadingCalls, isLoadingAgents, isAdmin, selectedProject }: TActiveCallsProps) => {
    const { spyOnCall, whisperToAgent, bargeIntoCall, isLoading } = useSupervisorActions();
    const [whisperCallId, setWhisperCallId] = useState<string | null>(null);
    const whisperInputRef = useRef<HTMLTextAreaElement | null>(null);

    const triggerAction = async (
        action: 'spy' | 'whisper' | 'barge',
        callId: string
    ) => {
        // For whisper, open modal instead of prompt (inline minimal UI)
        if (action === 'whisper') { setWhisperCallId(callId); return; }
        const justification = typeof window !== 'undefined'
            ? window.prompt('Enter justification for this supervisor action:')
            : '';
        if (!justification) return;
        if (action === 'spy') return spyOnCall({ callId, justification });
        if (action === 'barge') return bargeIntoCall({ callId, justification });
    };

    const submitWhisper = async () => {
        const justification = whisperInputRef.current?.value?.trim() || '';
        if (!whisperCallId || !justification) return;
        try {
            await whisperToAgent({ callId: whisperCallId, justification });
            if (typeof window !== 'undefined') window.alert('Whisper initiated');
            setWhisperCallId(null);
        } catch (e: any) {
            if (typeof window !== 'undefined') window.alert(`Failed: ${e?.message || 'Unknown error'}`);
        }
    };
    return (
        <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                        <ApolloIcon name="phone" className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-center space-x-1">
                            <p>Active Calls</p>
                            <p className="text-sm bg-green-500/40 px-1 rounded text-gray-600">
                                {data.length || 0}
                            </p>
                        </h3>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="default"
                        onClick={() => {
                            refetchActiveCalls();
                            refetchAgentStatus();
                        }}
                        disabled={isLoadingCalls || isLoadingAgents}
                        icon={<ApolloIcon name="refresh" className={` ${isLoadingCalls || isLoadingAgents ? 'animate-spin' : ''}`} />}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="success"
                        onClick={() => window.location.reload()}
                        icon={<ApolloIcon name="rotate-right" />}
                    >
                        Full Refresh
                    </Button>
                </div>
            </div>

            <div className="p-6 pt-0">

                {/* Debug Information */}
                {/* {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true' && ( */}
                {/* <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Debug Information</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <div><strong>Session Status:</strong> {session ? 'Loaded' : 'Loading'}</div>
              <div><strong>User Role:</strong> {session?.user?.role || 'Unknown'}</div>
              <div><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</div>
              <div><strong>Loading Calls:</strong> {isLoadingCalls ? 'Yes' : 'No'}</div>
              <div><strong>Calls Error:</strong> {callsError ? JSON.stringify(callsError) : 'None'}</div>
              <div><strong>Raw Calls Data:</strong> {JSON.stringify(activeCallsData)}</div>
              <div><strong>Filtered Calls Count:</strong> {activeCalls.length}</div>
              <div><strong>Selected Project:</strong> {selectedProject?.name || 'All Projects'}</div>
            </div>
          </div> */}
                {/* )} */}

                {data.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="relative">
                            <div className="flex items-center justify-center bg-gray-100 rounded-full w-20 h-20 mx-auto">
                                <ApolloIcon name="phone-decline" className="text-blue-500 text-4xl" />
                            </div>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Calls</h4>
                        <p className="text-gray-600 mb-4">
                            {selectedProject && selectedProject.value !== 'all'
                                ? `No active calls for ${selectedProject.name}`
                                : 'All agents are currently available'
                            }
                        </p>
                        <div className="text-xs text-gray-400">
                            {isLoadingCalls ? '🔄 Loading calls...' : '💡 Try refreshing or add ?debug=true for more info'}
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 max-h-[20rem] overflow-y-auto">
                        {data.map((call: any) => {
                            const isConnected = call.status === 'connected';
                            const isRinging = call.status === 'ringing';
                            const statusLabel = isConnected ? 'Connected' : isRinging ? 'Ringing' : call.status;
                            const statusCls = isConnected
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : isRinging
                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200';

                            return (
                                <div key={call.callId} className="py-2">
                                    <div className="flex  justify-between text-sm">
                                        <div className="flex-1">
                                            <div className="mt-1 flex items-center gap-2 text-xs">
                                                <ApolloIcon name="phone" className="text-evergreen" />
                                                <span className="font-medium text-gray-900">{call.phoneNumber}</span>
                                                <span className="text-gray-300">•</span>
                                                {call.lead?.name && (
                                                    <span className="text-blue-600 font-medium"> {call.lead.name}</span>
                                                )}


                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap ">
                                                <span className="text-gray-600">{call.agent?.name || `Ext ${call.extension}`}</span>
                                                {call.lead?.project && (
                                                    <span className="text-gray-600 bg-gray-100 px-1 rounded text-xs">{call.lead.project}</span>
                                                )}
                                                <span className={`border text-xs ${statusCls}`}>{statusLabel}</span>

                                            </div>

                                        </div>
                                        {/* Left: admin controls + timing */}
                                        <div>
                                            <div className="flex flex-col items-end gap-1">
                                                {isAdmin && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            aria-label="Listen"
                                                            title="Listen (Spy)"
                                                            disabled={isLoading}
                                                            onClick={() => triggerAction('spy', call.callId)}
                                                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                                                        >
                                                            <ApolloIcon name="volume" className="w-4 h-4 text-gray-600" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label="Whisper"
                                                            title="Whisper"
                                                            disabled={isLoading}
                                                            onClick={() => triggerAction('whisper', call.callId)}
                                                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                                                        >
                                                            <ApolloIcon name="bubble-question" className="w-4 h-4 text-gray-600" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label="Barge"
                                                            title="Barge"
                                                            disabled={isLoading}
                                                            onClick={() => triggerAction('barge', call.callId)}
                                                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                                                        >
                                                            <ApolloIcon name="users" className="w-4 h-4 text-gray-600" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <SupervisorControls call={call} />
                                            <div className="space-x-1 text-right">
                                                <span>{dayjs(call.startTime).format('HH:mm:ss')}</span>
                                                {isConnected ? (
                                                    <span className="text-green-600 font-medium">- {formatDuration(call.currentDuration)}</span>
                                                ) : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {/* Modal or whisper justification */}
                {whisperCallId && (
                    <WhisperCallModal
                        setWhisperCallId={setWhisperCallId}
                        isLoading={isLoading}
                        submitWhisper={submitWhisper}
                        whisperInputRef={whisperInputRef}
                    />
                )}
            </div>
        </Card >
    )
}

export default ActiveCalls;