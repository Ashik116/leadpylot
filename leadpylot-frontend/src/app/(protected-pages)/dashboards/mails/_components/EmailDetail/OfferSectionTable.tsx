 'use client';

import React, { useMemo } from 'react';
import { ColumnDef } from '@/components/shared/DataTable/types';
import DataTableOptimized from '@/components/shared/DataTableOptimizedVersion/DataTableOptimized';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import { getStatusBadgeColor } from '@/utils/utils';
import Badge from '@/components/ui/Badge';
import classNames from '@/utils/classNames';

interface OfferRow {
  _id?: string;
  project_name?: string;
  agent_name?: string;
  bank_name?: string;
  investment_volume?: number | string;
  interest_rate?: number | string;
  month?: number | string;
  bonus?: string | number;
  created_at?: string;
  createdAt?: string;
  project_id?: { name?: string };
  project?: { name?: string };
  agent_id?: { login?: string };
  agent?: { login?: string };
  bank_id?: { name?: string };
  bank?: { name?: string };
  payment_terms?: {
    info?: {
      info?: {
        months?: number | string;
      };
    };
  };
  bonus_amount?: {
    info?: {
      amount?: string | number;
    };
    name?: string;
  };
}

interface OfferSectionTableProps {
  offers: any[];
  showHeader?: boolean;
  sectionTitle?: string;
}

const OfferSectionTable: React.FC<OfferSectionTableProps> = ({ offers, showHeader = true, sectionTitle='Offers' }) => {
  // Transform offers data to include normalized fields
  const transformedOffers = useMemo<OfferRow[]>(() => {
    if (!offers || !Array.isArray(offers)) return [];

    return offers.map((offer: any) => ({
      ...offer,
      project_name:
        offer?.project_id?.name ||
        offer?.project?.name ||
        (Array.isArray(offer?.project) && offer?.project?.[0]?.name) ||
        '-',
      agent_name: offer?.agent_id?.login || offer?.agent?.login || '-',
      bank_name: offer?.bank_id?.name || offer?.bank?.name || '-',
      investment_volume: offer?.investment_volume || '-',
      interest_rate: offer?.interest_rate || '-',
      month: offer?.payment_terms?.info?.info?.months || offer?.payment_terms?.months || '-',
      bonus:
        offer?.bonus_amount?.info?.amount ||
        offer?.bonus_amount?.name ||
        offer?.bonus_amount ||
        '-',
      created_at: offer?.created_at || offer?.createdAt || '',
    }));
  }, [offers]);

  const columns = useMemo<ColumnDef<OfferRow>[]>(
    () => [
      {
        id: 'project',
        header: 'Project',
        accessorKey: 'project_name',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original?.project_name || '-'}</span>
        ),
      },
      {
        id: 'agent',
        header: 'Agent',
        accessorKey: 'agent_name',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original?.agent_name || '-'}</span>
        ),
      },
      {
        id: 'bank',
        header: 'Bank',
        accessorKey: 'bank_name',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original?.bank_name || '-'}</span>
        ),
      },
      {
        id: 'offer_status',
        header: () => <span className="whitespace-nowrap">offer Status</span>,
        enableSorting: false,
        accessorKey: 'current_stage',

        cell: (props: any) => {
          if (!props.row.original?.current_stage) return <span>-</span>;
          const offerStatus =
            props.row.original?.current_stage === 'opening'
              ? 'Contract'
              : props.row.original?.current_stage;
          const getBatchColor = getStatusBadgeColor(offerStatus.toLowerCase());

          return (
            <>
              <Badge
                className={classNames('w-fit rounded-full px-2 text-sm', getBatchColor)}
                innerClass="text-nowrap"
              >
                <p>{offerStatus.replace('_', ' ')}</p>
              </Badge>
            </>
          );
        },
      },
      {
        id: 'investment_volume',
        header: 'INV',
        accessorKey: 'investment_volume',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original?.investment_volume || '-'}</span>
        ),
      },
      {
        id: 'rate',
        header: 'RATE',
        accessorKey: 'interest_rate',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original?.interest_rate ? `${row.original.interest_rate}%` : '-'}
          </span>
        ),
      },
      {
        id: 'month',
        header: 'MON',
        accessorKey: 'month',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original?.month || '-'}</span>,
      },
      {
        id: 'bonus',
        header: 'BON',
        accessorKey: 'bonus',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original?.bonus || '-'}</span>,
      },
      {
        id: 'created_at',
        header: "OFFER S' CREATED",
        accessorKey: 'created_at',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original?.created_at
              ? dateFormateUtils(row.original.created_at, DateFormatType.SHOW_DATE)
              : '-'}
          </span>
        ),
      },
    ],
    []
  );

  if (!transformedOffers || transformedOffers.length === 0) {
    return (
      <></>
    );
  }

  return (
    <div >
      
      <div className="rounded-lg  bg-white p-1">
      {showHeader && <h6>{sectionTitle}</h6>}
        <DataTableOptimized
          className="max-h-[300px]"
          columns={columns}
          data={transformedOffers}
          showPagination={false}
          showHeader={true}
          headerSticky={true}
          enableColumnResizing={true}
          selectable={false}
          compact={true}
          instanceId="offers-section-table"
          tableClassName="min-w-full"
          fixedHeight="100px"
        />
      </div>
    </div>
  );
};

export default OfferSectionTable;
