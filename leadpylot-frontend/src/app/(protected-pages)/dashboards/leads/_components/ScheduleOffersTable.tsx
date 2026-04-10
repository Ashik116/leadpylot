import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import classNames from '@/utils/classNames';
import { Lead, TLead, Offer } from '@/services/LeadsService';

const { Tr, Th, Td, THead, TBody } = Table;

type ScheduleOffersTableProps = {
  lead: Lead | TLead;
};

type OfferRow = Offer & {
  agent_name?: string;
  project_name?: string;
};

const ScheduleOffersTable = ({ lead }: ScheduleOffersTableProps) => {
  // Normalize offers: prefer direct offers on lead, fallback to project[0].agent.offers
  const offers: OfferRow[] = useMemo(() => {
    const directOffers = (lead as any)?.offers as Offer[] | undefined;
    if (Array.isArray(directOffers) && directOffers.length > 0) {
      return directOffers as OfferRow[];
    }

    const nested = (lead as any)?.project?.[0]?.agent?.offers as Offer[] | undefined;
    if (Array.isArray(nested)) {
      return nested.map((o) => ({
        ...o,
        agent_name: (lead as any)?.project?.[0]?.agent?.login,
        project_name: (lead as any)?.project?.[0]?.name,
      }));
    }
    return [];
  }, [lead]);

  const columns = useMemo<ColumnDef<OfferRow>[]>(
    () => [
      {
        header: 'Agent',
        accessorKey: 'agent_name',
        cell: ({ row }) => <span>{row.original.agent_name || '-'}</span>,
      },
      {
        header: 'Project',
        accessorKey: 'project_name',
        cell: ({ row }) => <span className="text-nowrap">{row.original.project_name || '-'}</span>,
      },
      {
        header: 'Title',
        accessorKey: 'nametitle',
        cell: ({ row }) => <span>{row.original.nametitle || '-'}</span>,
      },
      {
        header: 'Bank',
        accessorKey: 'bank.name',
        cell: ({ row }) => <span className="text-nowrap">{row.original?.bank?.name || '-'}</span>,
      },
      {
        header: 'Investment',
        accessorKey: 'investment_volume',
        cell: ({ row }) => <span>{row.original.investment_volume ?? '-'}</span>,
      },
      {
        header: 'Scheduled Date',
        accessorKey: 'scheduled_date',
        cell: ({ row }) => {
          const d = (row.original as any)?.scheduled_date;
          return <span>{d ? dayjs(d).format('DD/MM/YYYY') : '-'}</span>;
        },
      },
      {
        header: 'Scheduled Time',
        accessorKey: 'scheduled_time',
        cell: ({ row }) => <span>{(row.original as any)?.scheduled_time || '-'}</span>,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <span>{(row.original as any)?.status || '-'}</span>,
      },
      {
        header: 'Created',
        accessorKey: 'created_at',
        cell: ({ row }) => (
          <span>{row.original?.created_at ? dayjs(row.original.created_at).format('DD/MM/YYYY HH:mm') : '-'}</span>
        ),
      },
      {
        header: 'Opening',
        accessorKey: 'opening',
        cell: ({ row }) => {
          const opening = (row.original as any)?.opening;
          return (
            <Badge
              className={classNames(
                'border-evergreen flex h-5 items-center justify-center rounded-full px-2 text-center text-xs text-white',
                opening?.active ? 'bg-evergreen' : 'bg-rust'
              )}
              content={opening ? (opening.active ? 'Active' : 'Inactive') : 'None'}
            />
          );
        },
      },
    ],
    []
  );

  if (!offers.length) {
    return <div className="py-4 text-sm text-gray-500">No scheduled offers for this lead.</div>;
  }

  return (
    <Card className='ml-15'>
      <div className="overflow-x-auto">
      <Table>
        <THead headerSticky={false}>
          <Tr>
            {columns.map((col, idx) => (
              <Th key={idx}>{String(col.header)}</Th>
            ))}
          </Tr>
        </THead>
        <TBody>
          {offers.map((offer) => (
            <Tr key={(offer as any)?._id || Math.random()}>
              <Td>{offer.agent_name || '-'}</Td>
              <Td>{offer.project_name || '-'}</Td>
              <Td>{(offer as any)?.nametitle || '-'}</Td>
              <Td className="text-nowrap">{offer?.bank?.name || '-'}</Td>
              <Td>{offer.investment_volume ?? '-'}</Td>
              <Td>{(offer as any)?.scheduled_date ? dayjs((offer as any)?.scheduled_date).format('DD/MM/YYYY') : '-'}</Td>
              <Td>{(offer as any)?.scheduled_time || '-'}</Td>
              <Td>{(offer as any)?.status || '-'}</Td>
              <Td>{offer?.created_at ? dayjs(offer.created_at).format('DD/MM/YYYY HH:mm') : '-'}</Td>
              <Td>
                {(() => {
                  const opening = (offer as any)?.opening;
                  if (!opening) return <span className="text-gray-400">None</span>;
                  return (
                    <Badge
                      className={classNames(
                        'border-evergreen flex h-5 items-center justify-center rounded-full px-2 text-center text-xs text-white',
                        opening?.active ? 'bg-evergreen' : 'bg-rust'
                      )}
                      content={opening.active ? 'Active' : 'Inactive'}
                    />
                  );
                })()}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
    </Card>
  );
};

export default ScheduleOffersTable;


