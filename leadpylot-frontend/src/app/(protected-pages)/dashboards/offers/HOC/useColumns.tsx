import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '../../_components/SharedColumnConfig';
import AgentBatch from '../../leads/_components/AgentBatch';
import { getStatusBadgeColor } from '@/utils/utils';
import Badge from '@/components/ui/Badge';
import RoleGuard from '@/components/shared/RoleGuard';
import { Role } from '@/configs/navigation.config/auth.route.config';
import classNames from '@/utils/classNames';
// import StatusIndicator from '@/components/shared/StatusIndicator';
import { usePathname } from 'next/navigation';

const useColumns = () => {
  const currentPath = usePathname();
  const baseColumns: ColumnDef<any>[] = [
    {
      id: 'expander',
      maxSize: 40,
      enableResizing: false,
      enableSorting: false,
      header: () => null,
    },
    {
      id: 'docs',
      header: 'Docs',
      enableSorting: false,
      //   cell: ({ row }) => {
      //     return (
      //       <ActionCell
      //         className={classNames('', row.original.files?.length > 0 ? 'bg-green-50' : 'bg-sand-5')}
      //         icon="file"
      //         // onClick={() => onOpenDocsModal(row.original)}
      //       >
      //         View Docs
      //       </ActionCell>
      //     );
      //   },
    },

    // {
    //   id: 'edit',
    //   header: 'Edit',
    //   enableSorting: false,
    //   cell: ({ row }: { row: any }) => {
    //     return (
    //       <>
    //         <ActionCell className="bg-blue-50" icon="pen" onClick={() => onEditOffer(row.original)}>
    //           Edit
    //         </ActionCell>
    //       </>
    //     );
    //   },
    // },

    {
      id: 'leadName',
      header: () => <span className="whitespace-nowrap">Lead</span>,
      accessorKey: 'leadName',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.lead_id?.contact_name}</span>
      ),
    },
    {
      id: 'partnerId',
      header: () => <span className="whitespace-nowrap">Partner Id</span>,
      accessorKey: 'partnerId',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.lead_id?.lead_source_no}</span>
      ),
    },
    {
      id: 'agent',
      header: 'Agent',
      accessorKey: 'agent',
      enableSorting: true,
      cell: ({ row }) => {
        const agentName = row.original.agent_id?.login;
        const agentColor = row.original.agent_id?.color_code;

        return <AgentBatch agentName={agentName} agentColor={agentColor} />;
      },
    },
    {
      id: 'investmentVolume',
      header: () => <span className="whitespace-nowrap">Investment</span>,
      accessorKey: 'investmentVolume',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.investment_volume.toFixed(2) || 'N/A'}
        </span>
      ),
    },
    {
      id: 'interestMonth',
      header: () => <span className="whitespace-nowrap">Month</span>,
      accessorKey: 'interestMonth',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.payment_terms?.info?.info?.months || 'N/A'}
        </span>
      ),
    },
    {
      id: 'updatedAt',
      header: () => <span className="whitespace-nowrap">Updates</span>,
      accessorKey: 'updatedAt',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.updatedAt || 'N/A'}</span>
      ),
    },
    {
      id: 'bankName',
      header: 'Bank',
      accessorKey: 'bankName',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original?.bank_id?.name || 'N/A'}</span>
      ),
    },
    {
      id: 'bonusAmount',
      header: 'Bonus',
      accessorKey: 'bonusAmount',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original?.bonus_amount?.info?.amount || 'N/A'}
        </span>
      ),
    },
    {
      id: 'projectName',
      header: 'Project',
      accessorKey: 'projectName',
      enableSorting: false,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.project_id?.name}</span>,
    },
    ...(currentPath?.includes('openings')
      ? [
          {
            id: 'interestRate',
            header: () => <span className="whitespace-nowrap">Rate</span>,
            accessorKey: 'interestRate',
            enableSorting: false,
            cell: ({ row }: any) => (
              <span className="whitespace-nowrap">
                {row.original.interestRate ? `${row.original.interest_rate}%` : 'N/A'}
              </span>
            ),
          },
          {
            id: 'lead_status',
            header: () => <span className="whitespace-nowrap">Lead Status</span>,
            enableSorting: false,
            accessorKey: 'lead_status',
            cell: (props: any) => {
              const statusName = props.row.original?.lead_id?.stage?.toLowerCase() ?? '';
              const useStatus = props.row.original?.lead_id?.status?.toLowerCase();

              // If use_status is "reclamation", use red background regardless of status name
              const badgeColor =
                useStatus === 'reclamation' ? 'bg-rust' : getStatusBadgeColor(statusName);

              // Truncate status name if it's too long (more than 10 characters)
              const truncatedStatus =
                statusName.length > 10 ? `${statusName.substring(0, 10)}...` : statusName;
              if (!statusName) {
                return <span className="whitespace-nowrap">-</span>;
              }
              return (
                <div>
                  <Badge
                    className={classNames('block w-24 text-center capitalize', badgeColor)}
                    innerClass="text-nowrap"
                    content={truncatedStatus}
                  />
                </div>
              );
            },
          },
          {
            id: 'status',
            header: 'Status',
            accessorKey: 'status',
            enableSorting: true,
            cell: ({ row }: any) => {
              return (
                <div className="flex items-center gap-2">
                  <StatusBadge status={row.original.status} />
                  <RoleGuard role={Role.ADMIN}>
                    {/* <SuccessButton offerId={row.original._id} currentStatus={row.original.status} /> */}
                    -
                  </RoleGuard>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return baseColumns;
};

export default useColumns;
