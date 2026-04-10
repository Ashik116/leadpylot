import Card from '@/components/ui/Card';
import ApolloIcon from "@/components/ui/ApolloIcon";
import dayjs from "dayjs";

type TAgentStatusProps = {
    summary?: {
        totalAgents: number;
        totalExtensions: number;
        availableAgents: number;
    };
    agents?: any[];
}
const AgentStatus = ({ summary, agents }: TAgentStatusProps) => {
    // Use real agents data passed from parent; no mock data
    const agentsToRender = Array.isArray(agents) ? agents : [];
    const uniqueAgentIds = Array.from(new Set(agentsToRender.map((a: any) => a.id))).length;
    const availableCount = agentsToRender.filter((a: any) => a.status === 'available').length;
    const localSummary = {
        totalAgents: uniqueAgentIds,
        totalExtensions: agentsToRender.length,
        availableAgents: availableCount,
    };
    const computedSummary = summary ?? localSummary;

    return (
        <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-2 rounded-xl">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                        <ApolloIcon name="users" className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Agent Status</h3>
                        <p className="text-sm text-gray-600">
                            {computedSummary.totalAgents} agents
                            {computedSummary.totalExtensions !== computedSummary.totalAgents && (
                                <span> • {computedSummary.totalExtensions} extensions</span>
                            )} • {computedSummary.availableAgents} available
                            {agentsToRender.filter((agent: any) => agent.isSelected).length > 0 && (
                                <span> • {agentsToRender.filter((agent: any) => agent.isSelected).length} selected</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <div className="py-2">
                <div className="space-y-4">
                    {agentsToRender.filter((agent: any) => agent.isSelected).length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                                <ApolloIcon name="check-circle" className="text-blue-600" />
                                <h4 className="text-sm font-medium text-blue-900">Currently Selected Extensions</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {agentsToRender
                                    .filter((agent: any) => agent.isSelected)
                                    .map((agent: any) => (
                                        <div key={agent.combinationId} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium border border-blue-300">
                                            {agent.aliasName || agent.name} • Ext. {agent.extension} • {agent.project}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-lg border border-green-100 divide-y">
                        {agentsToRender.map((agent: any) => {
                            const duplicateCount = agentsToRender.filter((a: any) => a.id === agent.id).length;
                            const statusPill = agent.status === 'in_call'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : agent.status === 'available'
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : agent.status === 'offline'
                                        ? 'bg-gray-100 text-gray-600 border border-gray-200'
                                        : 'bg-blue-100 text-blue-700 border border-blue-200';

                            const statusDot = agent.status === 'in_call'
                                ? 'bg-green-500/40'
                                : agent.status === 'available'
                                    ? 'bg-blue-300'
                                    : agent.status === 'offline'
                                        ? 'bg-gray-500/40'
                                        : 'bg-blue-500/40';

                            return (
                                <div
                                    key={agent.combinationId || agent.id}
                                    className={`flex justify-between items-center gap-3 px-3 py-2 text-sm ${agent.isSelected ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50`}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-10 h-10 rounded-sm flex items-center justify-center   ${statusDot}`}>
                                                <ApolloIcon name="user" className="text-gray-900 text-xl" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium text-gray-900 truncate max-w-[160px]">
                                                        {agent.aliasName || agent.name || agent.login}
                                                    </div>
                                                    <div className="flex items-center space-x-1 text-gray-600 text-xs">
                                                        <ApolloIcon name="phone" />
                                                        <span className={agent.isSelected ? 'font-semibold text-blue-700' : ''}>{agent.extension}</span>
                                                        {agent.selectedExtension && agent.selectedExtension !== agent.extension && (
                                                            <span className="text-blue-600">(Active: {agent.selectedExtension})</span>
                                                        )}
                                                    </div>


                                                    <div className="flex items-center space-x-1 text-gray-600 text-xs">
                                                        <ApolloIcon name="folder" />
                                                        <span className="truncate max-w-[140px]">{agent.project || 'No Project'}</span>
                                                        {duplicateCount > 1 && (
                                                            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px] font-medium">{duplicateCount} ext.</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center justify-center gap-2 text-gray-600">
                                                        <ApolloIcon name="signals" />
                                                        <span className="truncate max-w-[140px]"> {agent.sipUsername}</span>
                                                    </div>
                                                    {agent.isSelected && (
                                                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-blue-200">Selected</span>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>



                                    <div className="text-right space-y-1">
                                        {agent.currentCall && (
                                            <div className="flex items-center text-xs text-gray-700 space-x-2">
                                                <div className="flex items-center">
                                                    {agent.currentCall.direction === 'outbound' ? <ApolloIcon name="arrow-down" className="text-red-600 rotate-45" /> : <ApolloIcon name="arrow-up" className="text-blue-600 rotate-45" />}
                                                    <span> {agent.currentCall.phoneNumber} -{dayjs.duration(agent.currentCall.duration, 'seconds').format('mm:ss')}</span>
                                                </div>
                                                {agent.currentCall.project && (
                                                    <div className="flex items-center gap-1">
                                                        <ApolloIcon name="folder" />
                                                        <span className="text-blue-700"> {agent.currentCall.project}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusPill}`}>
                                            {agent.status === 'in_call' ? ' Busy' : agent.status === 'available' ? ' Free' : agent.status === 'offline' ? ' Offline' : ' Unknown'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Card>
    )
}

export default AgentStatus;