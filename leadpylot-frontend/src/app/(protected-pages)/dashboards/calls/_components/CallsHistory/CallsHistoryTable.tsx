"use client";

import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { EnhancedCallData, transformRecordingsToCallData } from '@/services/CDRService';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import ApolloIcon from '@/components/ui/ApolloIcon';
import dayjs from 'dayjs';
import { useCDRStatistics, useCallFilters, useRecentRecordings } from '@/services/hooks/useCDR';
import CallsStatisticsCard from './CallsStatisticsCard';
import CallsFilters from './CallsFilters';

interface CallsHistoryTableProps {
    onPlayRecording?: (row: EnhancedCallData) => void;
}

const CallsHistoryTable: React.FC<CallsHistoryTableProps> = ({
    onPlayRecording,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Monitoring is initialized inside LiveMonitoringDashboard to isolate re-renders

    // Use enhanced filters with URL sync
    const { filters, updateFilters, clearFilters, currentPage } = useCallFilters();
    const {
        data: recordingsData,
        isLoading: isRecordingsLoading,
    } = useRecentRecordings({
        ...filters,
        phone_number: searchTerm || undefined,
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
    });
    const {
        data: statisticsData,
    } = useCDRStatistics({
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
    });

    const callData: EnhancedCallData[] = recordingsData?.data
        ? transformRecordingsToCallData(recordingsData.data)
        : [];

    // Handle filter changes
    // const handleSearch = (value: string) => {
    //     setSearchTerm(value);
    // };

    const handleDispositionFilter = (disposition: string) => {
        updateFilters({
            disposition: disposition === 'all' ? undefined : disposition as any
        });
    };

    const handleDateRangeChange = (start: string, end: string) => {
        setDateRange({ start, end });
    };

    const columns: ColumnDef<EnhancedCallData>[] = useMemo(() => ([
        {
            id: 'destination',
            header: () => <span className="whitespace-nowrap">Phone Number</span>,
            cell: (props) => (
                <div className="flex flex-col">
                    <span className="font-medium">{props.row.original.destination}</span>
                    <span className="text-xs text-gray-500">{props.row.original.source}</span>
                </div>
            ),
        },
        {
            id: 'callDirection',
            header: () => <span className="whitespace-nowrap">Direction</span>,
            cell: (props) => (
                <div className="flex items-center">
                    {props.row.original.callDirection === 'incoming' ? (
                        <Tag className="bg-ocean-2 rounded-full border-0 text-white">
                            <ApolloIcon name="arrow-up" className="mr-1 rotate-45" />
                            Incoming
                        </Tag>
                    ) : (
                        <Tag className="bg-moss-2 rounded-full border-0 text-white">
                            <ApolloIcon name="arrow-down" className="mr-1 rotate-45" />
                            Outgoing
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            id: 'disposition',
            header: () => <span className="whitespace-nowrap">Result</span>,
            cell: (props) => {
                const disposition = props.row.original.disposition;
                const getDispositionColor = (disp: string) => {
                    switch (disp) {
                        case 'ANSWERED': return 'bg-green-100 text-green-800';
                        case 'NO ANSWER': return 'bg-yellow-100 text-yellow-800';
                        case 'BUSY': return 'bg-orange-100 text-orange-800';
                        case 'FAILED': return 'bg-red-100 text-red-800';
                        default: return 'bg-gray-100 text-gray-800';
                    }
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDispositionColor(disposition)}`}>
                        {disposition}
                    </span>
                );
            },
        },
        {
            id: 'duration',
            header: () => <span className="whitespace-nowrap">Duration</span>,
            cell: (props) => (
                <div className="flex flex-col">
                    <span className="font-medium">{props.row.original.formattedDuration}</span>
                    <span className="text-xs text-gray-500">
                        Talk: {props.row.original.formattedBillableDuration}
                    </span>
                </div>
            ),
        },
        {
            id: 'callDate',
            header: () => <span className="whitespace-nowrap">Date</span>,
            cell: (props) => (
                <span className="whitespace-nowrap">
                    {dayjs(props.row.original.callDate).format('DD MMM YYYY HH:mm:ss')}
                </span>
            ),
        },
        {
            id: 'recording',
            header: () => <span className="whitespace-nowrap">Recording</span>,
            cell: (props) => (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                    data-no-navigate="true"
                >
                    {props.row.original.disposition === 'ANSWERED' ? (
                        <Button
                            icon={<ApolloIcon name="play-circle" className="text-sm" />}
                            size="xs"
                            variant="default"
                            onClick={() => onPlayRecording && onPlayRecording(props.row.original)}
                        >
                            Play
                        </Button>
                    ) : (
                        <span className="text-xs text-gray-400">No Recording</span>
                    )}
                </div>
            ),
        },
    ]), [onPlayRecording]);

    const table = useBaseTable<EnhancedCallData>({
        tableName: 'calls-history-table',
        data: callData,
        loading: isRecordingsLoading,
        totalItems: recordingsData?.meta?.totalCDRRecords || 0,
        pageIndex: currentPage,
        pageSize: filters.limit || 20,
        columns,
        selectable: true,
        rowIdField: 'uniqueId',
        extraActions: (
            <CallsFilters
                setSearchTerm={setSearchTerm}
                filters={filters}
                handleDispositionFilter={handleDispositionFilter}
                dateRange={dateRange}
                setDateRange={setDateRange}
                clearFilters={clearFilters}
                handleDateRangeChange={handleDateRangeChange}
            />
        ),
        showHeader: true,
    });

    return (
        <>
            {statisticsData?.data ? (
                <CallsStatisticsCard statistics={statisticsData?.data || []} />
            ) : ''}
            <BaseTable {...table} />
        </>

    )
};

export default CallsHistoryTable;