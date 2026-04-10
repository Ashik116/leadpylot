'use client';

import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ColumnDef } from '@/components/shared/DataTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import Tag from '@/components/ui/Tag';
import { useSupervisorActionHistory, type SupervisorAction } from '@/services/hooks/useSupervisorActions';
import SuperVisorFilter from './SuperVisorFilter';

const getActionColor = (t: string) => ({
    spy: 'bg-blue-100 text-blue-800',
    whisper: 'bg-green-100 text-green-800',
    barge: 'bg-orange-100 text-orange-800',
    disconnect: 'bg-red-100 text-red-800',
} as Record<string, string>)[t] || 'bg-gray-100 text-gray-800';

const getStatusColor = (s: string) => ({
    completed: 'bg-green-100 text-green-800',
    active: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
} as Record<string, string>)[s] || 'bg-yellow-100 text-yellow-800';

const SupervisorActionsTable: React.FC = () => {
    const [pageIndex, setPageIndex] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [filters, setFilters] = useState({ action_type: '', start_date: '', end_date: '' });

    const { data, isLoading } = useSupervisorActionHistory({
        page: pageIndex,
        limit: pageSize,
        action_type: filters.action_type || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
    });

    const columns: ColumnDef<SupervisorAction>[] = useMemo(() => ([
        {
            id: 'date',
            header: () => <span className="whitespace-nowrap">Date</span>,
            cell: (props) => (
                <div className="text-sm">
                    <div className="font-medium">{dayjs(props.row.original.initiated_at).format('MMM DD, YYYY')}</div>
                    <div className="text-gray-500">{dayjs(props.row.original.initiated_at).format('HH:mm:ss')}</div>
                </div>
            ),
        },
        {
            id: 'action',
            header: () => <span className="whitespace-nowrap">Action</span>,
            cell: (p) => <Tag className={`capitalize ${getActionColor(p.row.original.action_type)}`}>{p.row.original.action_type}</Tag>,
        },
        {
            id: 'status',
            header: () => <span className="whitespace-nowrap">Status</span>,
            cell: (p) => <Tag className={`capitalize ${getStatusColor(p.row.original.status)}`}>{p.row.original.status}</Tag>,
        },
        {
            id: 'supervisor',
            header: () => <span className="whitespace-nowrap">Supervisor</span>,
            cell: (p) => (
                <div className="text-sm">
                    <div className="font-medium">{p.row.original.supervisor_name}</div>
                    <div className="text-gray-500">Ext: {p.row.original.supervisor_extension}</div>
                </div>
            ),
        },
        {
            id: 'agent',
            header: () => <span className="whitespace-nowrap">Target Agent</span>,
            cell: (p) => (
                <div className="text-sm">
                    <div className="font-medium">{p.row.original.agent_name || 'Unknown'}</div>
                    <div className="text-gray-500">Ext: {p.row.original.agent_extension}</div>
                </div>
            ),
        },
        {
            id: 'customer',
            header: () => <span className="whitespace-nowrap">Customer</span>,
            cell: (p) => (
                <div className="text-sm">
                    <div className="font-medium">{p.row.original.customer_number || '-'}</div>
                    {p.row.original.project_name && (
                        <div className="text-gray-500">{p.row.original.project_name}</div>
                    )}
                </div>
            ),
        },
        {
            id: 'duration',
            header: () => <span className="whitespace-nowrap">Duration</span>,
            cell: (p) => {
                const d = p.row.original.duration_seconds || 0;
                return <span className="font-medium">{Math.floor(d / 60)}m {d % 60}s</span>;
            },
        },
    ]), []);

    const table = useBaseTable<SupervisorAction>({
        tableName: 'supervisor-actions-table',
        data: data?.data.actions || [],
        loading: isLoading,
        totalItems: data?.data.pagination.total || 0,
        pageIndex,
        pageSize,
        columns,
        selectable: false,
        onPaginationChange: (p, s) => {
            setPageIndex(Number(p) || 1);
            if (s) setPageSize(Number(s));
        },
        extraActions: <SuperVisorFilter filters={filters} setPageIndex={setPageIndex} setFilters={setFilters} dateRange={{ start: filters.start_date, end: filters.end_date }} />,
        showHeader: true,
    });

    return <BaseTable {...table} />;
};

export default SupervisorActionsTable;


