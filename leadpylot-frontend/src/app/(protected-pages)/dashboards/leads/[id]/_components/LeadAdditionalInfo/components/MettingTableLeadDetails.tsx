'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import Tooltip from '@/components/ui/Tooltip';
import { Appointment } from '@/hooks/useAppointments';
import { dateFormateUtils, DateFormatType } from '@/utils/dateFormateUtils';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import NotFoundData from '../NotFoundData';
import { useTableHeader } from '@/utils/hooks/useTableHeader';
import { useMeetingTableActions } from '../hooks/useMeetingTableActions';
import AppointmentTableActions from '@/app/(protected-pages)/dashboards/leads/_components/AppointmentTableActions';
import { useAppointmentDialogStore } from '@/stores/appointmentDialogStore';

/** Show tooltip only for long text (likely to be truncated in the column). */
const DESCRIPTION_TOOLTIP_MIN_LENGTH = 35;

function DescriptionCell({ text }: { text: string }) {
  const showTooltip = text.length > DESCRIPTION_TOOLTIP_MIN_LENGTH;

  const content = <span className="block max-w-full min-w-0 truncate">{text}</span>;

  if (showTooltip) {
    return (
      <Tooltip
        title={text}
        hoverOnly
        wrapperClass="block truncate max-w-full min-w-0 cursor-default"
        className="max-w-xs break-words whitespace-normal"
      >
        {content}
      </Tooltip>
    );
  }
  return content;
}

type MettingTableLeadDetailsProps = {
  leadId: string;
  appointmentsData?: any;
  leftAction?: React.ReactNode;
};

export type MeetingWithProgress = Appointment;

const MettingTableLeadDetails = ({ leadId, leftAction }: MettingTableLeadDetailsProps) => {
  const renderHeader = useTableHeader();

  const { appointments, isLoading } = useMeetingTableActions({ leadId });
  const { openEditDialog } = useAppointmentDialogStore();
  const handleEdit = (appointment: Appointment, leadId: string) => {
    openEditDialog(appointment as any, leadId);
  };
  const columns = useMemo<ColumnDef<MeetingWithProgress>[]>(() => {
    return [
      {
        id: 'agent',
        header: () => renderHeader('AGENT'),
        accessorKey: 'creator.login',
        enableSorting: false,
        cell: ({ row }) => (
          <span>{row.original.creator?.login || row.original.created_by || '-'}</span>
        ),
      },
      {
        id: 'appointment',
        header: () => renderHeader('APPOINTMENT'),
        accessorKey: 'title',
        enableSorting: false,
        cell: ({ row }) => <span>{row.original.title || '-'}</span>,
      },
      {
        id: 'description',
        header: () => renderHeader('DESCRIPTION'),
        accessorKey: 'description',
        enableSorting: false,
        cell: ({ row }) => {
          const description = row.original.description || '-';
          return <DescriptionCell text={description} />;
        },
      },
      {
        id: 'meetingDate',
        header: () => renderHeader('MEETING DATE'),
        accessorKey: 'appointment_date',
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            {row.original.appointment_date
              ? dateFormateUtils(row.original.appointment_date, DateFormatType.SHOW_DATE)
              : '-'}
          </span>
        ),
      },
      {
        id: 'meetingTime',
        header: () => renderHeader('MEETING TIME'),
        accessorKey: 'appointment_time',
        enableSorting: false,
        cell: ({ row }) => <span>{row.original.appointment_time || '-'}</span>,
      },
      {
        id: 'meetingStatus',
        header: () => renderHeader('MEETING STATUS'),
        accessorKey: 'status',
        enableSorting: false,
        cell: ({ row }) => <span>{row.original.status || '-'}</span>,
      },
      {
        id: 'createdAt',
        header: () => renderHeader('CREATED'),
        accessorKey: 'createdAt',
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            {row.original.createdAt
              ? dateFormateUtils(row.original.createdAt, DateFormatType.SHOW_DATE)
              : '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => renderHeader('ACTIONS'),
        enableSorting: false,
        size: 80,
        cell: ({ row }) => <AppointmentTableActions appointment={row.original} leadId={leadId} />,
      },
    ];
  }, [renderHeader, leadId]);

  const leftCommonActions = <div className="flex items-center gap-2">{leftAction}</div>;

  return (
    <>
      <BaseTable
        tableName="lead-meetings-table"
        columns={columns}
        data={appointments?.data}
        loading={isLoading}
        loadingRowSize={10}
        totalItems={appointments?.meta?.total || 0}
        pageIndex={appointments?.meta?.page || 1}
        pageSize={appointments?.meta?.limit || 10}
        showPagination={false}
        showSearchInActionBar={false}
        showActionsDropdown={true}
        showActionComponent={true}
        selectable={false}
        returnFullObjects={true}
        styleColumnSorting="absolute right-2 -top-5"
        noData={(appointments?.data?.length || 0) === 0}
        customNoDataIcon={<NotFoundData message="No meetings available for this lead." />}
        tableClassName="max-h-full"
        enableColumnResizing={true}
        enableZoom={false}
        headerSticky={true}
        isBackendSortingReady={false}
        fixedHeight="auto"
        tableLayout="fixed"
        commonActionBarClasses="mt-2"
        leftCommonActions={leftCommonActions}
        onRowClick={(row: any) => handleEdit(row, leadId)}
      />
    </>
  );
};

export default MettingTableLeadDetails;
