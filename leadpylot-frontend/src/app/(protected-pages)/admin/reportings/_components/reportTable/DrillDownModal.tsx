'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import Dialog from '@/components/ui/Dialog/Dialog';
import { useDynamicHierarchicalReport } from '@/services/hooks/useReporting';
import React, { useCallback, useMemo, useState } from 'react';
import { transformHierarchicalData } from './reportingUtils';
import { useAgentsTableColumns } from './useAgentsTableColumns';

interface DrillDownModalProps {
    isOpen: boolean;
    onClose: () => void;
    primary: 'agent' | 'project' | 'status' | 'stage';
    secondary: 'agent' | 'project' | 'status' | 'stage';
    primaryIds: string[];
    secondaryIds?: string[];
    dateRange?: { start_date?: string; end_date?: string };
    leadType?: 'all' | 'live' | 'recycle';
    title?: string;
    onCellClick?: (params: { type: 'agent' | 'project'; id: string; name: string }) => void;
    nestingLevel?: number;
}

const MAX_NESTING_LEVEL = 3;

const DrillDownModal: React.FC<DrillDownModalProps> = ({
    isOpen,
    onClose,
    primary,
    secondary,
    primaryIds,
    secondaryIds,
    dateRange,
    leadType = 'all',
    title,
    onCellClick,
    nestingLevel = 0,
}) => {
    const [nestedModalParams, setNestedModalParams] = useState<{
        primary: 'agent' | 'project' | 'status' | 'stage';
        secondary: 'agent' | 'project' | 'status' | 'stage';
        primaryIds: string[];
        secondaryIds?: string[];
        title: string;
    } | null>(null);

    // Fetch drill-down data
    const { data: reportData, isLoading, error } = useDynamicHierarchicalReport({
        primary,
        secondary,
        lead_type: leadType,
        start_date: dateRange?.start_date,
        end_date: dateRange?.end_date,
        date_field: 'createdAt',
        primary_ids: primaryIds,
        secondary_ids: secondaryIds,
    });

    // Transform the data for the table
    const tableData = useMemo(() => {
        if (!reportData?.data) return [];
        return transformHierarchicalData(reportData.data, primary, secondary);
    }, [reportData, primary, secondary]);

    // Calculate footer totals
    const footerTotals = useMemo(() => {
        if (!reportData?.meta?.total) return null;

        const apiTotal = reportData.meta.total;
        return {
            leads_live: apiTotal.lead?.live || 0,
            leads_recycle: apiTotal.lead?.recycle || 0,
            u_n2_live: apiTotal.conversion_rate?.live || 0,
            u_n2_recycle: apiTotal.conversion_rate?.recycle || 0,
            reklamation_live: apiTotal.reclamation?.live || 0,
            reklamation_recycle: apiTotal.reclamation?.recycle || 0,
            offers_live: apiTotal.angebots?.live || 0,
            offers_recycle: apiTotal.angebots?.recycle || 0,
            openings_live: apiTotal.openings?.live || 0,
            openings_recycle: apiTotal.openings?.recycle || 0,
            confirmation_live: apiTotal.confirmation?.live || 0,
            confirmation_recycle: apiTotal.confirmation?.recycle || 0,
            u_trager_live: apiTotal.payment_voucher?.live || 0,
            u_trager_recycle: apiTotal.payment_voucher?.recycle || 0,
            netto1_live: apiTotal.netto1?.live || 0,
            netto1_recycle: apiTotal.netto1?.recycle || 0,
            netto2_live: apiTotal.netto2?.live || 0,
            netto2_recycle: apiTotal.netto2?.recycle || 0,
        };
    }, [reportData]);

    // Handle cell click for nested drill-down
    const handleCellClick = useCallback((params: { type: 'agent' | 'project'; id: string; name: string }) => {
        // Prevent opening new modal if one is already open or max nesting reached
        if (nestingLevel >= MAX_NESTING_LEVEL) return;

        // Determine the drill-down parameters
        let newPrimary: 'agent' | 'project' | 'status' | 'stage';
        let newSecondary: 'agent' | 'project' | 'status' | 'stage';

        if (params.type === 'project') {
            newPrimary = 'project';
            newSecondary = 'agent';
        } else if (params.type === 'agent') {
            newPrimary = 'agent';
            newSecondary = 'project';
        } else {
            return; // Unsupported type
        }

        setNestedModalParams((prev) => {
            // Prevent opening if already open
            if (prev) return prev;

            return {
                primary: newPrimary,
                secondary: newSecondary,
                primaryIds: [params.id],
                title: `${params.name} - Details`,
            };
        });

        // Also call parent's onCellClick if provided
        onCellClick?.(params);
    }, [nestingLevel, onCellClick]);

    // Get table columns - disable clicks when nested modal is open
    const columns = useAgentsTableColumns({
        footerTotals,
        primaryGrouping: primary,
        secondaryGrouping: secondary,
        leadType,
        onCellClick: (nestingLevel < MAX_NESTING_LEVEL && !nestedModalParams) ? handleCellClick : undefined,
    });

    const modalTitle = title || `${primary.toUpperCase()} Details`;

    return (
        <>
            <Dialog
                isOpen={isOpen}
                onClose={() => onClose()}
                width="100vw"
                height="80vh"
                contentClassName="flex flex-col overflow-visible"
            >
                <div className="flex flex-col h-full overflow-visible">
                    <div className="mb-4 flex items-center justify-between border-b">
                        <h2 className="text-xl font-bold text-gray-900">{modalTitle}</h2>
                    </div>

                    <div className="flex-1 relative overflow-visible">
                        {error ? (
                            <div className="flex min-h-[400px] items-center justify-center">
                                <div className="text-center">
                                    <p className="text-red-500">Failed to load drill-down data</p>
                                    <p className="mt-2 text-sm text-gray-500">
                                        {error instanceof Error ? error.message : 'An error occurred'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full overflow-visible">
                                <BaseTable
                                    tableName={`drilldown-${primary}-${secondary}-${nestingLevel}`}
                                    data={tableData}
                                    columns={columns}
                                    loading={isLoading}
                                    pageIndex={1}
                                    pageSize={tableData?.length || 10}
                                    totalItems={tableData?.length || 0}
                                    showActionsDropdown={false}
                                    selectable={false}
                                    deleteButton={false}
                                    showSearchInActionBar={true}
                                    showPagination={true}
                                    showNavigation={true}
                                    enableColumnResizing={false}
                                    fixedHeight="calc(80vh - 120px)"
                                    rowClassName={(row) => {
                                        const isClickable = nestingLevel < MAX_NESTING_LEVEL && !nestedModalParams;
                                        const baseClass = isClickable ? 'cursor-pointer hover:bg-gray-50 transition-colors duration-200' : 'transition-colors duration-200';
                                        if (row.original?.isFirstRowOfGroup && row.index > 0) {
                                            return `${baseClass} border-t border-gray-200`;
                                        }
                                        return baseClass;
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default DrillDownModal;

