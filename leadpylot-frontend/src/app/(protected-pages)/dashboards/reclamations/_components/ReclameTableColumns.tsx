import dayjs from 'dayjs';
import { useMemo } from 'react';

const ReclameTableColums = () => {
  // Define all columns
  return useMemo(
    () => [
      // {
      //     header: () => (
      //         <Checkbox
      //             // checked={!!columnVisibility[key]}
      //             onChange={() => { }}
      //             className="mr-2"
      //         // name={key}
      //         />
      //     ),
      //     accessorKey: 'checkbox',
      //     enableSorting: false,
      //     cell: (props) => (
      //         <Checkbox
      //             // checked={!!columnVisibility[key]}
      //             onChange={() => { }}
      //             className="mr-2"
      //         // name={key}
      //         />
      //     ),
      // },

      {
        header: () => <span className="whitespace-nowrap">Phone</span>,
        accessorKey: 'lead_id.phone',
        enableSorting: false,
        cell: (props: any) => (
          <span className="whitespace-nowrap">{props.row.original?.lead_id?.phone || 'N/A'}</span>
        ),
      },
      {
        header: () => <span className="whitespace-nowrap">Email</span>,
        accessorKey: 'lead_id.email_from',
        enableSorting: false,
        cell: (props: any) => (
          <span className="whitespace-nowrap">
            {props.row.original?.lead_id?.email_from || 'N/A'}
          </span>
        ),
      },
      {
        header: () => <span className="whitespace-nowrap">Partner Id</span>,
        accessorKey: 'lead_id.lead_source_no',
        enableSorting: false,
        cell: (props: any) => (
          <span className="whitespace-nowrap">
            {props.row.original?.lead_id?.lead_source_no || 'N/A'}
          </span>
        ),
      },
      {
        header: () => <span className="whitespace-nowrap">Status</span>,
        accessorKey: 'status',
        enableSorting: false,
        cell: (props: any) => {
          const status = props.row.original?.status;
          let text = '';
          let colorClass = '';

          if (status === 1) {
            text = 'Accepted';
            colorClass = 'bg-evergreen';
          } else if (status === 0) {
            text = 'Pending';
            colorClass = 'bg-ember';
          } else {
            text = 'Rejected';
            colorClass = 'bg-rust';
          }

          return (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${colorClass}`}
            >
              {text}
            </span>
          );
        },
      },
      {
        header: () => <span className="whitespace-nowrap">Reason</span>,
        accessorKey: 'reason',
        enableSorting: false,
        cell: (props: any) => (
          <span className="whitespace-nowrap">{props.row.original?.reason}</span>
        ),
      },
      {
        header: () => <span className="whitespace-nowrap">Response</span>,
        accessorKey: 'response',
        enableSorting: false,
        cell: (props) => (
          <span className="whitespace-nowrap">{props.row.original?.response || '-'}</span>
        ),
      },
      {
        header: () => <span className="whitespace-nowrap">Lead Date</span>,
        accessorKey: 'createdAt',
        enableSorting: false,
        cell: (props: any) => (
          <span className="whitespace-nowrap">
            {dayjs(props.row.original?.lead_id?.lead_date).format('MMM D, YYYY')}
          </span>
        ),
      },
    ],
    []
  );
};

export default ReclameTableColums;
