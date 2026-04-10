'use client';

import { useMemo } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Tooltip from '@/components/ui/Tooltip';
import { useAgents, useEmailFilters } from '../../_hooks';
import { useEmailStore } from '../../_stores';
import RoleGuard from '@/components/shared/RoleGuard';
import { Role } from '@/configs/navigation.config/auth.route.config';
import Button from '@/components/ui/Button';

interface FilterSectionProps {
    isCompact?: boolean;
}

export default function FilterSection({ isCompact }: FilterSectionProps) {
    const {
        OPENING_OPTIONS,
        isOpeningExpanded,
        isAssigningExpanded,
        searchTerm,
        selectedOpening,
        selectedAgent,
        setSearchTerm,
        handlePendingClick,
        handleOpeningToggle,
        handleOpeningSelect,
        handleClearOpening,
        handleAssigningToggle,
        handleAgentSelect,
        handleClearAgent,
    } = useEmailFilters();

    const { agents, isLoading, filterAgents } = useAgents();
    const filteredAgents = useMemo(() => filterAgents(searchTerm), [filterAgents, searchTerm]);
    const { currentView } = useEmailStore();

    const selectedOpeningLabel = selectedOpening
        ? OPENING_OPTIONS.find((item) => item.value === selectedOpening)?.label || 'Opening'
        : 'Opening';

    const selectedAgentLabel = selectedAgent
        ? agents.find((item: any) => item._id === selectedAgent)?.info?.name || agents.find((item: any) => item._id === selectedAgent)?.login || 'Assigned Agent'
        : 'Assigned Agent';

    // Compact mode - Pending button
    const PendingButton = isCompact ? (
        <Tooltip title="Pending" placement="right">
            <button
                type="button"
                onClick={handlePendingClick}
                className={`flex w-full items-center justify-center rounded-md px-2 transition-colors ${currentView === 'pending' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
            >
                <ApolloIcon
                    name="clock-eight"
                    className={`text-[1.164625rem] ${currentView === 'pending' ? 'text-white' : 'text-gray-500'}`}
                />
            </button>
        </Tooltip>
    ) : (
        <button
            type="button"
            onClick={handlePendingClick}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-1 text-[0.8152375rem] font-medium transition-colors ${currentView === 'pending' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
        >
            <ApolloIcon
                name="clock-eight"
                className={`text-[0.9317rem] ${currentView === 'pending' ? 'text-white' : 'text-gray-500'}`}
            />
            <span>Pending</span>
        </button>
    );

    return (
        <div className="space-y-0.5 ">
            {PendingButton}

            {/* Opening Filter */}
            {isCompact ? (
                <Dropdown
                    placement="right-start"
                    renderTitle={
                        <Tooltip title={selectedOpeningLabel} placement="right">
                            <button
                                type="button"
                                className={`flex w-full items-center justify-center rounded-md px-2 transition-colors ${selectedOpening ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <ApolloIcon
                                    name="folder"
                                    className={`text-[1.164625rem] ${selectedOpening ? 'text-white' : 'text-gray-500'}`}
                                />
                            </button>
                        </Tooltip>
                    }
                >
                    {OPENING_OPTIONS.map((option) => (
                        <Dropdown.Item
                            key={option.value}
                            eventKey={option.value}
                            onClick={() => handleOpeningSelect(option.value)}
                            className={selectedOpening === option.value ? 'bg-blue-50 text-blue-700' : ''}
                        >
                            <div className="flex items-center gap-2">
                                <ApolloIcon
                                    name="circle"
                                    className={`text-[0.8152375rem] ${selectedOpening === option.value ? 'text-blue-600' : 'text-gray-400'
                                        }`}
                                />
                                <span>{option.label}</span>
                            </div>
                        </Dropdown.Item>
                    ))}
                    {selectedOpening && (
                        <>
                            <div className="my-1 border-t border-gray-200" />
                            <Dropdown.Item eventKey="clear" onClick={handleClearOpening}>
                                <div className="flex items-center gap-2 text-red-600">
                                    <ApolloIcon name="cross" className="text-[0.8152375rem]" />
                                    <span>Clear Filter</span>
                                </div>
                            </Dropdown.Item>
                        </>
                    )}
                </Dropdown>
            ) : (
                <div>
                    <div
                        onClick={handleOpeningToggle}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-px text-[0.8152375rem] font-medium transition-colors ${selectedOpening ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <ApolloIcon
                                name="folder"
                                className={`text-[0.9317rem] ${selectedOpening ? 'text-white' : 'text-gray-500'}`}
                            />
                            <span>{selectedOpeningLabel}</span>
                        </div>
                        <div className="flex items-center">
                            {selectedOpening && (
                                <Button
                                    variant="plain"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearOpening();
                                    }}
                                    icon={<ApolloIcon name="cross" className='text-white text-sm' />}
                                    className='hover:bg-transparent'
                                />
                            )}
                            <ApolloIcon
                                name={isOpeningExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
                                className="text-white text-sm"
                            />
                        </div>
                    </div>
                    <div
                        className={`ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-200 pl-2 transition-all overflow-hidden ${isOpeningExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                    >
                        {OPENING_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleOpeningSelect(option.value)}
                                className={`flex w-full items-center gap-3 rounded-md px-1 py-0.5 text-[0.698775rem] font-medium transition-colors ${selectedOpening === option.value
                                    ? 'bg-evergreen/10 text-evergreen '
                                    : 'text-sand-1 hover:bg-sand-5'
                                    }`}
                            >
                                <ApolloIcon
                                    name="circle"
                                    className={`text-sm ${selectedOpening === option.value ? 'text-evergreen' : 'text-black'
                                        }`}
                                />
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Assigned Agent Filter (Admin Only) */}
            <RoleGuard role={Role.ADMIN}>
                {isCompact ? (
                    <Dropdown
                        placement="right-start"
                        renderTitle={
                            <Tooltip title={selectedAgentLabel} placement="right">
                                <button
                                    type="button"
                                    className={`flex w-full items-center justify-center rounded-md px-2 transition-colors ${selectedAgent ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <ApolloIcon
                                        name="user"
                                        className={`text-sm ${selectedAgent ? 'text-white' : 'text-black'}`}
                                    />
                                </button>
                            </Tooltip>
                        }
                    >
                        <div className="px-3 py-px w-64">
                            <Input
                                placeholder="Search agents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                prefix={<ApolloIcon name="search" className="text-[0.8152375rem]" />}
                                size="sm"
                            />
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex justify-center px-3 py-4">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                                </div>
                            ) : filteredAgents.length === 0 ? (
                                <p className="px-3 py-4 text-center text-[0.698775rem] text-gray-500">
                                    {searchTerm ? 'No agents found' : 'No agents available'}
                                </p>
                            ) : (
                                filteredAgents.map((agent: any) => (
                                    <Dropdown.Item
                                        key={agent._id}
                                        eventKey={agent._id}
                                        onClick={() => handleAgentSelect(agent._id)}
                                        className={agent._id === selectedAgent ? 'bg-blue-50 text-blue-700' : ''}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ApolloIcon
                                                name="user"
                                                className={`text-[0.8152375rem] ${agent._id === selectedAgent ? 'text-blue-600' : 'text-gray-400'
                                                    }`}
                                            />
                                            <div className="flex-1 truncate">
                                                <div className="font-medium text-sm">{agent?.info?.name || agent?.login}</div>
                                                <div className="text-[0.698775rem] text-gray-500">@{agent?.login}</div>
                                            </div>
                                        </div>
                                    </Dropdown.Item>
                                ))
                            )}
                        </div>
                        {selectedAgent && (
                            <>
                                <div className="my-1 border-t border-gray-200" />
                                <Dropdown.Item eventKey="clear" onClick={handleClearAgent}>
                                    <div className="flex items-center gap-2 text-red-600">
                                        <ApolloIcon name="cross" className="text-[0.8152375rem]" />
                                        <span>Clear Filter</span>
                                    </div>
                                </Dropdown.Item>
                            </>
                        )}
                    </Dropdown>
                ) : (
                    <div>
                        <div
                            onClick={handleAssigningToggle}
                            className={`flex w-full items-center justify-between rounded-md px-3 py-px text-[0.8152375rem] font-medium transition-colors ${selectedAgent ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <ApolloIcon
                                    name="user"
                                    className={`text-[0.9317rem] ${selectedAgent ? 'text-white' : 'text-gray-500'}`}
                                />
                                <span>{selectedAgentLabel}</span>
                            </div>
                            <div className="flex items-center">
                                {selectedAgent && (
                                    <Button
                                        variant="plain"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearAgent();
                                        }}
                                        icon={<ApolloIcon name="cross" className='text-white text-sm' />}
                                        className='hover:bg-transparent'
                                    />
                                )}
                                <ApolloIcon
                                    name={isAssigningExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
                                    className="text-white text-sm"
                                />
                            </div>
                        </div>
                        <div
                            className={`ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-200 pl-2 transition-all overflow-hidden ${isAssigningExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                }`}
                        >
                            <div className="px-1 py-2">
                                <Input
                                    placeholder="Search agents..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    prefix={<ApolloIcon name="search" className="text-[0.8152375rem]" />}
                                    size="sm"
                                />
                            </div>
                            <div className="max-h-64 space-y-0.5 overflow-y-auto">
                                {isLoading ? (
                                    <div className="flex justify-center px-1 py-4">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                                    </div>
                                ) : filteredAgents.length === 0 ? (
                                    <p className="px-1 py-4 text-center text-[0.698775rem] text-gray-500">
                                        {searchTerm ? 'No agents found' : 'No agents available'}
                                    </p>
                                ) : (
                                    filteredAgents.map((agent: any) => (
                                        <button
                                            key={agent._id}
                                            type="button"
                                            onClick={() => handleAgentSelect(agent._id)}
                                            className={`flex w-full items-center gap-3 rounded-md px-1 py-0.5 text-[0.698775rem] font-medium transition-colors ${agent._id === selectedAgent
                                                ? 'bg-evergreen/10 text-evergreen '
                                                : 'text-sand-1 hover:bg-sand-5'
                                                }`}
                                        >
                                            <ApolloIcon
                                                name="user"
                                                className={`text-sm ${agent._id === selectedAgent ? 'text-evergreen' : 'text-black'
                                                    }`}
                                            />
                                            <div className="flex-1 truncate text-left">
                                                <div className="font-medium">{agent?.info?.name || agent?.login}</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </RoleGuard>
        </div>
    );
}
