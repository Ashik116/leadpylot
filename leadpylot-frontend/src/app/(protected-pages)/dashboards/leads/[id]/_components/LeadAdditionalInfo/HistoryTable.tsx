import Table from '@/components/ui/Table';
import { TLead } from '@/services/LeadsService';
import type { ColumnDef } from '@tanstack/react-table';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import NotFoundData from './NotFoundData';
import { useTableHeader } from '@/utils/hooks/useTableHeader';

const { Tr, Th, Td, THead, TBody } = Table;

type HistoryTableProps = {
    lead: TLead;
};

interface HistoryData {
    sourceProject: string;
    sourceAgent: string;
    sourceAgentColor: string | undefined;
    prevProject: string;
    prevAgent: string;
    prevAgentColor: string | undefined;
}

const HistoryTable = ({ lead }: HistoryTableProps) => {
    // Prepare history data from lead
    const historyData = useMemo<HistoryData[]>(() => {
        const sourceProject = lead?.source_project?.name || '-';
        const sourceAgent = lead?.source_agent?.login || '-';
        const sourceAgentColor = lead?.source_agent?.color_code ?? undefined;
        const prevProject = lead?.prev_team_id?.name || '-';
        const prevAgent = lead?.prev_user_id?.login || '-';
        const prevAgentColor = lead?.prev_user_id?.color_code ?? undefined;

        // Only return data if at least one field has a value
        if (sourceProject === '-' && sourceAgent === '-' && prevProject === '-' && prevAgent === '-') {
            return [];
        }

        return [{ sourceProject, sourceAgent, sourceAgentColor, prevProject, prevAgent, prevAgentColor }];
    }, [lead]);

    const renderHeader = useTableHeader();

    const columns = useMemo<ColumnDef<HistoryData>[]>(
        () => [
            {
                header: () => renderHeader('Source Project'),
                accessorKey: 'sourceProject',
                cell: ({ row }) => (
                    <span className="text-sm font-medium">{row.original.sourceProject}</span>
                ),
            },
            {
                header: () => renderHeader('Source Agent'),
                accessorKey: 'sourceAgent',
                cell: ({ row }) => (
                    <span className="text-sm font-medium" style={{ color: row.original.sourceAgentColor }}>{row.original.sourceAgent}</span>
                ),
            },
            {
                header: () => renderHeader('prev Project'),
                accessorKey: 'prevProject',
                cell: ({ row }) => (
                    <span className="text-sm font-medium" >{row.original.prevProject}</span>
                ),
            },
            {
                header: () => renderHeader('prev Agent'),
                accessorKey: 'currentProject',
                cell: ({ row }) => (
                    <span className="text-sm font-medium" style={{ color: row.original.prevAgentColor }}>{row.original.prevAgent}</span>
                ),
            },
        ],
        [renderHeader]
    );

    const table = useReactTable({
        data: historyData,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (historyData.length === 0) {
        return <NotFoundData message="No history data available for this lead." />;
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <THead headerSticky={false}>
                    {table?.getHeaderGroups()?.map((headerGroup) => (
                        <Tr key={headerGroup?.id}>
                            {headerGroup?.headers?.map((header) => (
                                <Th key={header?.id} colSpan={header?.colSpan}>
                                    {flexRender(header?.column?.columnDef?.header, header?.getContext())}
                                </Th>
                            ))}
                        </Tr>
                    ))}
                </THead>
                <TBody>
                    {table?.getRowModel()?.rows?.map((row) => (
                        <Tr key={row?.id} className="hover:bg-gray-50 text-xs">
                            {row?.getVisibleCells()?.map((cell) => (
                                <Td key={cell?.id}>
                                    {flexRender(cell?.column?.columnDef?.cell, cell?.getContext())}
                                </Td>
                            ))}
                        </Tr>
                    ))}
                </TBody>
            </Table>
        </div>
    );
};

export default HistoryTable;

