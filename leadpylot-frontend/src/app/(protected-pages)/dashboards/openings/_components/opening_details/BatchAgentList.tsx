'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';

interface BatchAgentListProps {
    agents: any[];
    selectedAgentId: string | null;
    onAgentClick: (agent: any) => void;
    onDelete: (agentId: string, e: React.MouseEvent) => void;
    getAgentName: (agentId: string) => string;
    isLoading?: boolean;
}

const formatAmount = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0';
    return typeof amount === 'number' ? amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0';
};

export default function BatchAgentList({
    agents,
    selectedAgentId,
    onAgentClick,
    onDelete,
    getAgentName,
    isLoading = false,
}: BatchAgentListProps) {
    if (agents.length === 0) return null;

    return (
        <div className="border-t border-gray-200 bg-white px-3 py-2">
            <div className="flex flex-wrap gap-2">
                {agents.map((agent: any, index: number) => {
                    const agentId = agent.agent_id || agent._id;
                    const isSelected = selectedAgentId === agentId;
                    const paidAmount = agent.paid_amount || agent.paidAmount || 0;
                    const actualAmount = agent.actual_amount || agent.actualAmount || 0;
                    const expectedAmount = agent.expected_amount || agent.expectedAmount || 0;

                    return (
                        <div
                            key={agentId || index}
                            onClick={() => onAgentClick(agent)}
                            className={`group relative flex flex-col gap-1 rounded-lg border px-2.5 py-1.5 transition-all cursor-pointer min-w-[180px] ${isSelected
                                ? 'border-blue-300 bg-blue-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                                }`}
                        >
                            {/* Line 1: Agent Name, Percentage, Delete Button */}
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <ApolloIcon
                                        name="user"
                                        className={`text-xs shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                                    />
                                    <span
                                        className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}
                                        title={getAgentName(agentId)}
                                    >
                                        {getAgentName(agentId)}
                                    </span>
                                    <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                                        {agent.percentage}%
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => onDelete(agentId, e)}
                                    className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                    disabled={isLoading}
                                    title="Delete"
                                >
                                    <ApolloIcon name="cross" className="text-xs" />
                                </button>
                            </div>

                            {/* Line 2: Financial Details - Paid, Actual, Expected */}
                            <div className="flex items-center gap-2 text-xxs">
                                <div className="flex items-center gap-0.5">
                                    <span className="text-gray-500 uppercase tracking-wide font-medium">Paid:</span>
                                    <span className="font-semibold text-green-600">{formatAmount(paidAmount)}</span>
                                </div>
                                <span className="text-gray-300">|</span>
                                <div className="flex items-center gap-0.5">
                                    <span className="text-gray-500 uppercase tracking-wide font-medium">Actual:</span>
                                    <span className="font-semibold text-blue-600">{formatAmount(actualAmount)}</span>
                                </div>
                                <span className="text-gray-300">|</span>
                                <div className="flex items-center gap-0.5">
                                    <span className="text-gray-500 uppercase tracking-wide font-medium">Expected:</span>
                                    <span className="font-semibold text-gray-700">{formatAmount(expectedAmount)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}