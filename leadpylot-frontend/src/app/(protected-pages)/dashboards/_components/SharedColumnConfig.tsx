import { ColumnDef } from '@/components/shared/DataTable';
import { ApolloIcon } from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { memo, useState } from 'react';
import useDidUpdate from '@/components/ui/hooks/useDidUpdate';
import AgentBatch from '../leads/_components/AgentBatch';
import { ActionCell } from '../accepted-offers/_components/FileHandler';
import { useUpdateOffer } from '@/services/hooks/useLeads';
import { Role } from '@/configs/navigation.config/auth.route.config';
import RoleGuard from '@/components/shared/RoleGuard';
import { FileHandler } from '../accepted-offers/_components/FileHandler';
import { DashboardType, OPeningDashboardType, TDashboardType } from './dashboardTypes';
import { DOCUMENT_TYPES } from '@/components/shared/DocumentTypeOptions';
import CellInlineEdit from '@/components/shared/CellInlineEdit';
import OfferCallCounter from './OfferCallCounter';
import { getStatusBadgeColor } from '@/utils/utils';
import Badge from '@/components/ui/Badge';
import classNames from '@/utils/classNames';
import Select from '@/components/ui/Select';
import TodoList from '../todo/_components/TodoList';
import { DocumentSlotViewer } from '@/components/shared/DocumentSlotViewer';

interface SharedColumnConfigProps {
  expandedRowId: string;
  handleExpanderToggle: (id: string) => void;
  onOpenDocsModal: (rowData: any) => void;
  onEditOffer?: (rowData: any) => void;
  dashboardType: TDashboardType;
  selectedProgressFilter?: TDashboardType; // Add this prop
  userRole?: string;
  isFileUploading?: (id: string, documentType: string, table: string) => boolean; // Add loading state prop
  handleFileUpload?: (
    id: string,
    files: File[] | null | undefined,
    table?: string,
    fileType?: string,
    fullItem?: any
  ) => void;
  handleDocumentAction?: (
    item: any,
    documentType: string,
    action: 'preview' | 'download' | 'delete'
  ) => void;
  handleBulkDownload?: (columnId: string) => void;
  selectedItems?: any[];
  onOpenPdfModal?: (rowData: any) => void;
  bonusAmountOptions?: any;
  paymentTermOptions?: any;
  negativeAndPrivatOptions?: any;
  // Todo callbacks for offer_tickets dashboard
  updateTodo?: (id: string, updates: { isDone?: boolean; message?: string }) => Promise<void>;
  onTodoClick?: (taskId: string) => void;
  sessionUserName?: string;
  // Opening details handler
  onOpenOpeningDetails?: (rowData: any) => void;
}

// // Use shared document type constants
// const FileTypes = {
//   OFFER_EMAIL: DOCUMENT_TYPES.OFFER_EMAIL,
//   OPENING_EMAIL: DOCUMENT_TYPES.OPENING_EMAIL,
//   CONFIRMATION_EMAIL: DOCUMENT_TYPES.CONFIRMATION_EMAIL,
//   PAYMENT_EMAIL: DOCUMENT_TYPES.PAYMENT_EMAIL,
//   NETTO1_EMAIL: DOCUMENT_TYPES.NETTO1_EMAIL,
//   NETTO2_EMAIL: DOCUMENT_TYPES.NETTO2_EMAIL,
//   PAYMENT_MAIL: DOCUMENT_TYPES.PAYMENT_EMAIL,
// };

// ExpanderCell component
export const ExpanderCell = memo<{ isExpanded: boolean; onToggle: () => void }>(
  ({ isExpanded, onToggle }) => (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      data-no-navigate="true"
      className="flex h-full cursor-pointer items-center justify-center"
    >
      <ApolloIcon
        name={isExpanded ? 'chevron-arrow-down' : 'chevron-arrow-right'}
        className="text-2xl"
      />
    </div>
  )
);
ExpanderCell.displayName = 'ExpanderCell';

// Status badge component
export const StatusBadge = memo<{ status: string }>(({ status }) => {
  if (!status) return <span className="text-gray-500">N/A</span>;

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'ticket':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

// Generic Offer Dropdown component
interface OfferDropdownProps {
  offerId: string;
  currentStatus: string;
  fieldName: 'status' | 'load_and_opening';
  options: Array<{ value: string; label: string }>;
  colorMap?: Record<string, string>;
  placeholder?: string;
}

export const OfferDropdown = memo<OfferDropdownProps>(
  ({ offerId, currentStatus, fieldName, options, colorMap = {}, placeholder }) => {
    const updateOfferMutation = useUpdateOffer();
    const [status, setStatus] = useState(currentStatus || '');
    const defaultColor = 'text-gray-700';

    // Sync status when currentStatus prop changes (after query refetch)
    useDidUpdate(() => {
      setStatus(currentStatus || '');
    }, [currentStatus]);

    const handleStatusChange = (selectedOption: { value: string; label: string } | null) => {
      if (!selectedOption) return;
      const newStatus = selectedOption.value;
      if (newStatus && newStatus !== status) {
        updateOfferMutation.mutate({
          id: offerId,
          data: { [fieldName]: newStatus },
        });
        // Optimistically update local state
        setStatus(newStatus);
      }
    };

    const getTextColorClass = (value: string) => {
      return colorMap[value?.toLowerCase()] || defaultColor;
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };

    const selectedOption = options.find((opt) => opt.value === status) || null;
    const textColorClass = getTextColorClass(status);

    return (
      <div className="min-w-[100px] overflow-hidden" onClick={handleClick}>
        <Select
          value={selectedOption}
          onChange={handleStatusChange}
          options={options}
          placeholder={placeholder}
          isDisabled={updateOfferMutation.isPending}
          isClearable={false}
          className={`w-full ${textColorClass}`}
          classNamePrefix="offer-select"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          // menuPosition="fixed"
          styles={{
            menuPortal: (base) => ({
              ...base,
              zIndex: 99999,
            }),
            menu: (base) => ({
              ...base,
              zIndex: 99999,
            }),
            singleValue: (base) => ({
              ...base,
              fontSize: '0.875rem', // text-sm (14px)
            }),
          }}
          size="xs"
        />
      </div>
    );
  }
);
OfferDropdown.displayName = 'OfferDropdown';

// Status Dropdown component for updating offer status
export const StatusDropdown = memo<{ offerId: string; currentStatus: string }>(
  ({ offerId, currentStatus }) => (
    <OfferDropdown
      offerId={offerId}
      currentStatus={currentStatus}
      fieldName="status"
      options={[
        { value: 'pending', label: 'Pending' },
        { value: 'sent', label: 'Sent' },
      ]}
      colorMap={{
        sent: 'text-green-600 font-medium',
        pending: 'text-gray-700',
      }}
    />
  )
);
StatusDropdown.displayName = 'StatusDropdown';

// Load and Opening Dropdown component for updating load_and_opening field
export const LoadAndOpeningDropdown = memo<{ offerId: string; currentStatus: string }>(
  ({ offerId, currentStatus }) => (
    <OfferDropdown
      offerId={offerId}
      currentStatus={currentStatus}
      fieldName="load_and_opening"
      options={[
        { value: 'opening', label: 'Opening' },
        { value: 'load', label: 'Load' },
      ]}
      colorMap={{
        opening: 'text-black font-medium',
        load: 'text-black font-medium',
      }}
      placeholder="Select"
    />
  )
);
LoadAndOpeningDropdown.displayName = 'LoadAndOpeningDropdown';

const SharedColumnConfig = ({
  expandedRowId,
  handleExpanderToggle,
  // onOpenDocsModal,
  onEditOffer,
  dashboardType,
  selectedProgressFilter,
  userRole,
  isFileUploading,
  handleFileUpload,
  handleDocumentAction,
  handleBulkDownload,
  selectedItems = [],
  onOpenPdfModal,
  bonusAmountOptions,
  paymentTermOptions,
  negativeAndPrivatOptions,
  updateTodo,
  onTodoClick,
  sessionUserName,
  onOpenOpeningDetails,
}: SharedColumnConfigProps): ColumnDef<any>[] => {
  const openingDetailsViewOpen =
    Object.values(OPeningDashboardType)?.includes(dashboardType) ||
    dashboardType === DashboardType.OFFER;

  const baseColumns: ColumnDef<any>[] = [
    // {
    //   id: 'expander',
    //   maxSize: 20,
    //   enableResizing: false,
    //   enableSorting: false,
    //   header: () => null,
    //   cell: ({ row }) => (
    //     <ExpanderCell
    //       isExpanded={expandedRowId === row.original?._id}
    //       onToggle={() => handleExpanderToggle(row.original?._id)}
    //     />
    //   ),
    // },
    // Only show Agent column for non-Agent users
    ...(userRole !== Role.AGENT
      ? [
          {
            id: 'agent ',
            header: 'Agent',
            accessorKey: 'agent',
            enableSorting: true,
            columnWidth: 104,
            minSize: 62,
            cell: ({ row }: { row: any }) => {
              const agentColor = row.original?.agentColor;

              return <AgentBatch agentName={row.original?.agent} agentColor={agentColor} />;
            },
          },
        ]
      : []),
    {
      id: 'projectName',
      header: 'Project',
      accessorKey: 'projectName',
      enableSorting: true,
      columnWidth: 120,
      minSize: 70,
      cell: ({ row }) => (
        <span style={{ color: row.original?.projectColor }} className="whitespace-nowrap">
          {row.original?.projectName}
        </span>
      ),
    },
    {
      id: 'partnerId',
      header: () => <span className="whitespace-nowrap">lead Id</span>,
      accessorKey: 'partnerId',
      enableSorting: true,
      columnWidth: 113,
      minSize: 70,
      cell: (props: any) => (
        <CellInlineEdit
          props={props}
          type="lead_source_no"
          externalLeadId={props.row.original?.leadId}
          isCopyable={true}
          onRowClick={openingDetailsViewOpen ? onOpenOpeningDetails : undefined}
        />
      ),
    },
    {
      id: 'leadName',
      header: () => <span className="whitespace-nowrap">Lead</span>,
      accessorKey: 'leadName',
      enableSorting: true,
      columnWidth: 143,
      minSize: 95,
      cell: (props: any) => (
        <CellInlineEdit
          props={props}
          type="leadName"
          externalLeadId={props.row.original?.leadId}
          apiUpdateField="contact_name"
          isCopyable={true}
          enableTodo={true}
          onRowClick={openingDetailsViewOpen ? onOpenOpeningDetails : undefined}
        />
      ),
    },
    {
      id: 'leadEmail',
      header: () => <span className="whitespace-nowrap">Lead Email</span>,
      accessorKey: 'leadEmail',
      enableSorting: true,
      columnWidth: 204,
      minSize: 100,
      cell: (props: any) => (
        <CellInlineEdit
          props={props}
          type="email_from"
          externalLeadId={props.row.original?.leadId}
          apiUpdateField="email_from"
          isCopyable={true}
          onRowClick={openingDetailsViewOpen ? onOpenOpeningDetails : undefined}
        />
      ),
    },
    ...(dashboardType === DashboardType.OFFER
      ? [
          {
            id: 'offer_calls',
            header: () => <span className="whitespace-nowrap">Calls</span>,
            accessorKey: 'offer_calls',
            enableSorting: true,
            columnWidth: 108,
            minSize: 75,
            cell: (props: any) => {
              const leadId = props.row.original?.leadId;
              return (
                <OfferCallCounter
                  offerCalls={props.row.original?.offer_calls || 0}
                  leadId={leadId}
                />
              );
            },
          },
        ]
      : []),
    {
      id: 'phone',
      header: () => <span className="whitespace-nowrap">Phone</span>,
      accessorKey: 'phone',
      enableSorting: true,
      columnWidth: 131,
      minSize: 80,
      cell: (props: any) => (
        <CellInlineEdit
          props={props}
          type="phone"
          externalLeadId={props.row.original?.leadId}
          apiUpdateField="phone"
          isCopyable={true}
          onRowClick={openingDetailsViewOpen ? onOpenOpeningDetails : undefined}
        />
      ),
    },
    {
      id: 'bankName',
      header: 'Bank',
      accessorKey: 'bankName',
      enableSorting: true,
      columnWidth: 139,
      minSize: 60,
      cell: ({ row }) => (
        <span className="whitespace-nowrap" title={row.original?.bankName}>
          {row.original?.bankName ? row.original?.bankName : '-'}
        </span>
      ),
    },

    {
      id: 'nickName',
      header: 'B.N',
      accessorKey: 'nickName',
      enableSorting: true,
      columnWidth: 80,
      minSize: 43,
      cell: ({ row }: { row: any }) => (
        <span className="whitespace-nowrap">{row.original?.nickName || '-'}</span>
      ),
    },
    {
      id: 'investment_volume',
      header:
        dashboardType === DashboardType.OFFER || dashboardType === DashboardType.OPENING
          ? 'Amount'
          : 'Amount',
      accessorKey: 'investment_volume',
      enableSorting: true,
      columnWidth: 117,
      minSize: 50,
      cell: (props: any) => (
        <CellInlineEdit
          props={props}
          type="investmentVolume"
          apiUpdateField="investment_volume"
          apiType="offer"
          offerId={props?.row?.original?._id}
          onRowClick={openingDetailsViewOpen ? onOpenOpeningDetails : undefined}
        />
      ),
    },
    {
      id: 'interest_rate',
      header: () => <span className="whitespace-nowrap">Rate</span>,
      accessorKey: 'interest_rate',
      enableSorting: true,
      columnWidth: 103,
      minSize: 59,
      cell: (props: any) => (
        <CellInlineEdit
          props={props}
          type="interestRate"
          apiType="offer"
          offerId={props?.row?.original?._id}
          apiUpdateField="interest_rate"
          onRowClick={openingDetailsViewOpen ? onOpenOpeningDetails : undefined}
        />
      ),
    },
    {
      id: 'interestMonth',
      header: () => <span className="whitespace-nowrap">Mon</span>,
      accessorKey: 'interestMonth',
      enableSorting: true,
      columnWidth: 84,
      minSize: 40,
      cell: (props: any) => (
        <CellInlineEdit
          props={props}
          type="interestMonth"
          apiUpdateField="payment_terms"
          apiType="offer"
          offerId={props?.row?.original?._id}
          options={paymentTermOptions}
          dropdown={true}
          initialValue={props?.row?.original?.interestMonth}
          selectOptionClassName="min-w-[200px]"
          onRowClick={openingDetailsViewOpen ? onOpenOpeningDetails : undefined}
        />
      ),
    },
    {
      id: 'bonusAmount',
      header: 'Bon',
      accessorKey: 'bonusAmount',
      enableSorting: true,
      columnWidth: 87,
      minSize: 41,
      cell: (props: any) => (
        <CellInlineEdit
          props={props}
          type="bonusAmount"
          apiUpdateField="bonus_amount"
          apiType="offer"
          offerId={props?.row?.original?._id}
          options={bonusAmountOptions}
          dropdown={true}
          initialValue={props?.row?.original?.bonusAmount}
          selectOptionClassName="min-w-[200px]"
          onRowClick={openingDetailsViewOpen ? onOpenOpeningDetails : undefined}
        />
      ),
    },
    {
      id: 'source_id',
      header: 'Source',
      accessorKey: 'source_id',
      enableSorting: true,
      columnWidth: 110,
      minSize: 73,
      cell: (props: any) => {
       
        return(
        <span style={{ color: props?.row?.original?.originalData?.lead_id?.source_id?.color }} className="whitespace-nowrap">{props?.row?.original?.source_name || '-'}</span>
      )},
    },
    // {
    //   id: 'lead_status',
    //   header: () => <span className="whitespace-nowrap">Lead Status</span>,
    //   enableSorting: false,
    //   accessorKey: 'lead_status',

    //   cell: (props: any) => {
    //     const statusName = props.row.original?.leadStatus ?? '';

    //     // Truncate status name if it's too long (more than 10 characters)
    //     const truncatedStatus =
    //       statusName.length > 10 ? `${statusName.substring(0, 10)}...` : statusName;
    //     return (
    //       <div>
    //         <CellInlineEdit
    //           props={props}
    //           type="status"
    //           apiUpdateField="status_id"
    //           dropdown={true}
    //           options={negativeAndPrivatOptions}
    //           initialValue={truncatedStatus}
    //           leadId={props.row.original?.leadId}
    //           selectOptionClassName="min-w-[130px]"
    //         />
    //       </div>
    //     );
    //   },
    // },
    {
      id: 'offer_status',
      header: () => <span className="whitespace-nowrap">offer Status</span>,
      enableSorting: true,
      accessorKey: 'offer_status',
      columnWidth: 134,
      minSize: 60,
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
    ...(dashboardType === DashboardType?.OPENING || dashboardType === DashboardType?.OFFER
      ? [
          {
            id: 'load_and_opening',
            header: () => <span className="whitespace-nowrap">O/L</span>,
            enableSorting: true,
            accessorKey: 'load_and_opening',
            columnWidth: 109,
            minSize: 108,
            cell: (props: any) => {
              const O_L_Status = props.row.original?.load_and_opening;
              const offerId = props.row.original?._id;
              if (!offerId) return <span className="text-gray-500">-</span>;

              return (
                <div className="w-fit">
                  {userRole === Role.ADMIN ? (
                    <LoadAndOpeningDropdown offerId={offerId} currentStatus={O_L_Status || ''} />
                  ) : (
                    <span className="text-gray-500">{O_L_Status || '-'}</span>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
    {
      id: 'offerType',
      header: 'Type',
      accessorKey: 'offerType',
      columnWidth: 89,
      minSize: 50,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original?.offerType ? row.original?.offerType?.slice(0, 4) : '-'}
        </span>
      ),
    },
    // Only show reference_no column for non-offer and non-opening dashboard types
    ...(dashboardType !== DashboardType?.OFFER && dashboardType !== DashboardType?.OPENING
      ? [
          {
            id: 'reference_no',
            header: 'Ref. No',
            accessorKey: 'reference_no',
            enableSorting: true,
            columnWidth: 90,
            minSize: 80,
            cell: ({ row }: { row: any }) => {
              return (
                <div className="flex items-center space-x-1">
                  <span
                    className="line-clamp-1 truncate whitespace-nowrap"
                    title={row.original?.reference_no || '-'}
                  >
                    {row.original?.reference_no || '-'}
                  </span>
                </div>
              );
            },
          },
        ]
      : []),
    {
      id: 'updatedAt',
      header: () => <span className="whitespace-nowrap">Updates</span>,
      accessorKey: 'updatedAt',
      enableSorting: true,
      columnWidth: 118,
      minSize: 70,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original?.updatedAt || '-'}</span>
      ),
    },
    {
      id: 'createdAt',
      header: () => <span className="whitespace-nowrap">Created</span>,
      accessorKey: 'updatedAt', // Note: accessorKey is updatedAt in original, keeping it but user asked for createdAt column width
      enableSorting: true,
      columnWidth: 118,
      minSize: 70,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original?.createdAt || '-'}</span>
      ),
    },
    {
      id: 'nametitle',
      header: () => <span className="whitespace-nowrap">Title</span>,
      accessorKey: 'nametitle',
      enableSorting: true,
      columnWidth: 96,
      minSize: 52,
      cell: ({ row }) => {
        return (
          <span className="whitespace-nowrap">{row.original?.originalData?.nametitle || '-'}</span>
        );
      },
    },

    ...(userRole === Role?.ADMIN
      ? [
          {
            id: 'edit',
            header: 'Edit',
            enableSorting: false,
            columnWidth: 67,
            minSize: 65,
            cell: ({ row }: { row: any }) => {
              if (!onEditOffer) return null;
              return (
                <ActionCell
                  className="bg-blue-50"
                  icon="pen"
                  onClick={() => onEditOffer(row.original)}
                >
                  Edit
                </ActionCell>
              );
            },
          },
        ]
      : []),
  ];

  // Helper function to get email type based on dashboard type or selected filter
  const getEmailType = (dashboardType1: TDashboardType, selectedFilter?: TDashboardType) => {
    // Use selected filter if available, otherwise use dashboard type
    const typeToUse =
      selectedFilter === DashboardType?.NETTO ? dashboardType1 : selectedFilter || dashboardType1;
    switch (typeToUse) {
      case DashboardType?.OFFER:
        return DOCUMENT_TYPES?.OFFER_EMAIL;
      case DashboardType?.OPENING:
        return DOCUMENT_TYPES?.OPENING_EMAIL;
      case DashboardType?.CONFIRMATION:
        return DOCUMENT_TYPES?.CONFIRMATION_EMAIL;
      case DashboardType?.PAYMENT:
        return DOCUMENT_TYPES?.PAYMENT_EMAIL;
      case DashboardType?.NETTO1:
        return DOCUMENT_TYPES?.NETTO1_EMAIL;
      case DashboardType?.NETTO2:
        return DOCUMENT_TYPES?.NETTO2_EMAIL;
      default:
        return DOCUMENT_TYPES?.OFFER_EMAIL;
    }
  };

  // Add email column for all dashboard types
  baseColumns.push({
    id: 'email',
    header: () => <span className="whitespace-nowrap">Email</span>,
    accessorKey: 'email',
    enableSorting: false,
    columnWidth: 88,
    minSize: 86,
    cell: ({ row }) => {
      // const rowData = row.original?.files;
      // const updateDashboardType =
      //   dashboardType === DashboardType.NETTO
      //     ? row.original?.leadStatus?.toLowerCase()
      //     : dashboardType;
      // const emailType = getEmailType(updateDashboardType, selectedProgressFilter);
      // const emailFile = rowData?.find((file: any) => file?.type === emailType);
      // if (userRole !== Role.ADMIN && !emailFile) {
      //   return <span className="font-4xl font-bold whitespace-nowrap">-</span>;
      // }
      // return (
      //   <FileHandler
      //     offerId={row.original?._id}
      //     table="offers"
      //     type={emailType}
      //     section={emailFile}
      //     headerInfo={{ column: 'email', leadName: row.original?.leadName, table: dashboardType }}
      //     isFileUploading={isFileUploading}
      //     handleFileUpload={(id, files) =>
      //       handleFileUpload?.(id, files, 'offers', emailType, row.original)
      //     }
      //     handleDocumentAction={(item, documentType, action) =>
      //       handleDocumentAction?.(item, documentType, action)
      //     }
      //   />
      // );
      return (
        <DocumentSlotViewer
          documents={row.original?.document_slots?.offer_email?.documents}
          emails={row.original?.document_slots?.offer_email?.emails}
          slotName="offer_email"
          slotLabel="Offer Email"
          offerId={row.original?._id}
          userRole={userRole}
          showUpload={true}
          columnId="email"
          selectedItems={selectedItems}
          onBulkDownload={handleBulkDownload}
        />
      );
    },
  });

  // Add dashboard-specific columns
  if (dashboardType === DashboardType.OFFER) {
    baseColumns.push({
      id: 'send',
      header: 'Send',
      accessorKey: 'send',
      enableSorting: true,
      columnWidth: 108,
      minSize: 105,
      cell: ({ row }) => {
        // const checkValidate = [DOCUMENT_TYPES.OFFER_CONTRACT, DOCUMENT_TYPES.OFFER_EMAIL].every(
        //   (type) => row.original?.files?.some((file: any) => file?.type === type)
        // );

        return (
          <div className="flex items-center space-x-1">
            <RoleGuard role={Role.AGENT}>
              <StatusBadge status={row.original?.status} />
            </RoleGuard>
            <RoleGuard role={Role.ADMIN}>
              <StatusDropdown offerId={row.original?._id} currentStatus={row.original?.status} />
            </RoleGuard>
          </div>
        );
      },
    });
    baseColumns.push({
      id: 'offer',
      header: 'Offer',
      accessorKey: 'offer',
      enableSorting: true,
      columnWidth: 87,
      cell: ({ row }) => {
        const rowData = row.original?.files;
        const offerEmail = rowData?.find(
          (file: any) => file?.type === DOCUMENT_TYPES?.OFFER_CONTRACT
        );
        if (userRole !== Role?.ADMIN && !offerEmail) {
          return <span className="font-4xl font-bold whitespace-nowrap">-</span>;
        }
        return (
          <FileHandler
            offerId={row.original?._id}
            table="offers"
            type={DOCUMENT_TYPES.OFFER_CONTRACT}
            section={offerEmail}
            isFileUploading={isFileUploading}
            headerInfo={{
              column: 'contract',
              leadName: row.original?.leadName,
              table: dashboardType,
            }}
            handleFileUpload={(id, files) =>
              handleFileUpload?.(id, files, 'offers', DOCUMENT_TYPES.OFFER_CONTRACT, row.original)
            }
            handleDocumentAction={(item, documentType, action) =>
              handleDocumentAction?.(item, documentType, action)
            }
            columnId="offer"
            selectedItems={selectedItems}
            onBulkDownload={handleBulkDownload}
          />
        );
      },
    });
    // Only show PDF generate column for admin users
    if (userRole === Role?.ADMIN) {
      baseColumns.push({
        id: 'pdf',
        header: 'PDF',
        accessorKey: 'pdf',
        enableSorting: false,
        columnWidth: 96,
        minSize: 32,
        cell: ({ row }) => {
          const rowData = row.original?.files;
          const offerEmail = rowData?.find(
            (file: any) => file?.type === DOCUMENT_TYPES?.OFFER_CONTRACT
          );
          return (
            <Button
              variant="success"
              size="xs"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                onOpenPdfModal?.(row.original);
              }}
              icon={<ApolloIcon name={offerEmail ? 'rotate-right' : 'file'} />}
            >
              {offerEmail ? '' : 'Generate'}
            </Button>
          );
        },
      });
    }
  }
  if (dashboardType === DashboardType?.OPENING || dashboardType === DashboardType?.PAYMENT) {
    baseColumns.push(
      {
        id: 'contract_id',
        header: 'Con.',
        accessorKey: 'contract_id',
        enableSorting: true,
        columnWidth: 100,
        minSize: 86,
        cell: ({ row }) => {
          // const rowData = row.original?.files;
          // const filterFiles = rowData?.find(
          //   (file: any) => file?.type === DOCUMENT_TYPES?.OPENING_CONTRACT
          // );
          // if (userRole !== Role?.ADMIN && !filterFiles) {
          //   return <span className="font-4xl font-bold whitespace-nowrap">-</span>;
          // }
          // return (
          //   <FileHandler
          //     offerId={row.original?._id}
          //     table="offers"
          //     type={DOCUMENT_TYPES.OPENING_CONTRACT}
          //     section={filterFiles}
          //     isFileUploading={isFileUploading}
          //     headerInfo={{
          //       column: 'opening contract',
          //       leadName: row.original?.leadName,
          //       table: dashboardType,
          //     }}
          //     handleFileUpload={(id, files) =>
          //       handleFileUpload?.(
          //         id,
          //         files,
          //         'offers',
          //         DOCUMENT_TYPES?.OPENING_CONTRACT,
          //         row.original
          //       )
          //     }
          //     handleDocumentAction={(item, documentType, action) =>
          //       handleDocumentAction?.(item, documentType, action)
          //     }
          //   />
          // );
          return (
            <DocumentSlotViewer
              documents={row.original?.document_slots?.contract?.documents}
              emails={row.original?.document_slots?.contract?.emails}
              slotName="contract"
              slotLabel="Contract"
              offerId={row.original?._id}
              userRole={userRole}
              showUpload={true}
              columnId="contract_id"
              selectedItems={selectedItems}
              onBulkDownload={handleBulkDownload}
            />
          );
        },
      },
      {
        id: 'id_confirmation',
        header: 'ID',
        accessorKey: 'id_confirmation',
        enableSorting: true,
        columnWidth: 100,
        minSize: 86,
        cell: ({ row }) => {
          /*
          const rowData = row.original?.files;
          const filterFiles = rowData?.find(
            (file: any) => file?.type === DOCUMENT_TYPES?.OPENING_ID
          );
          if (userRole !== Role?.ADMIN && !filterFiles) {
            return <span className="font-4xl font-bold whitespace-nowrap">-</span>;
          }
          return (
            <FileHandler
              offerId={row.original?._id}
              table="offers"
              type={DOCUMENT_TYPES?.OPENING_ID}
              section={filterFiles}
              isFileUploading={isFileUploading}
              headerInfo={{
                column: 'opening Id',
                leadName: row.original?.leadName,
                table: dashboardType,
              }}
              handleFileUpload={(id, files) =>
                handleFileUpload?.(id, files, 'offers', DOCUMENT_TYPES?.OPENING_ID, row.original)
              }
              handleDocumentAction={(item, documentType, action) =>
                handleDocumentAction?.(item, documentType, action)
              }
            />
          );
          */
          return (
            <DocumentSlotViewer
              documents={row.original?.document_slots?.id_files?.documents}
              emails={row.original?.document_slots?.id_files?.emails}
              slotName="id_files"
              slotLabel="ID Files"
              offerId={row.original?._id}
              userRole={userRole}
              showUpload={true}
              columnId="id_confirmation"
              selectedItems={selectedItems}
              onBulkDownload={handleBulkDownload}
            />
          );
        },
      },
      {
        id: 'annah_id',
        header: 'Ann.',
        accessorKey: 'annah_id',
        enableSorting: true,
        columnWidth: 210,
        minSize: 150,
        cell: ({ row }) => {
          /*
          const rowData = row.original?.files;
          const filterFiles = rowData?.find(
            (file: any) => file?.type === DOCUMENT_TYPES?.CONFIRMATION_CONTRACT
          );
          if (userRole !== Role?.ADMIN && !filterFiles) {
            return <span className="font-4xl font-bold whitespace-nowrap">-</span>;
          }
          return (
            <FileHandler
              offerId={row.original?._id}
              table="offers"
              type={DOCUMENT_TYPES?.CONFIRMATION_CONTRACT}
              section={filterFiles}
              isFileUploading={isFileUploading}
              headerInfo={{
                column: 'confirmation contract',
                leadName: row.original?.leadName,
                table: dashboardType,
              }}
              handleFileUpload={(id, files) =>
                handleFileUpload?.(
                  id,
                  files,
                  'offers',
                  DOCUMENT_TYPES?.CONFIRMATION_CONTRACT,
                  row.original
                )
              }
              handleDocumentAction={(item, documentType, action) =>
                handleDocumentAction?.(item, documentType, action)
              }
            />
          );
          */
          return (
            <DocumentSlotViewer
              documents={row.original?.document_slots?.annahme?.documents}
              emails={row.original?.document_slots?.annahme?.emails}
              slotName="annahme"
              slotLabel="Annahme"
              offerId={row.original?._id}
              userRole={userRole}
              showUpload={true}
              columnId="annah_id"
              selectedItems={selectedItems}
              onBulkDownload={handleBulkDownload}
            />
          );
        },
      },
      {
        id: 'swift_id',
        header: 'Swift',
        enableSorting: true,
        cell: ({ row }) => {
          /*
          const rowData = row.original?.files;
          const filterFiles = rowData?.find(
            (file: any) => file?.type === DOCUMENT_TYPES?.PAYMENT_CONTRACT
          );
          if (userRole !== Role?.ADMIN && !filterFiles) {
            return <span className="font-4xl font-bold whitespace-nowrap">-</span>;
          }
          return (
            <FileHandler
              offerId={row.original?._id}
              table="offers"
              type={DOCUMENT_TYPES?.PAYMENT_CONTRACT}
              section={filterFiles}
              isFileUploading={isFileUploading}
              headerInfo={{
                column: 'swift',
                leadName: row.original?.leadName,
                table: dashboardType,
              }}
              handleFileUpload={(id, files) =>
                handleFileUpload?.(
                  id,
                  files,
                  'offers',
                  DOCUMENT_TYPES?.PAYMENT_CONTRACT,
                  row.original
                )
              }
              handleDocumentAction={(item, documentType, action) =>
                handleDocumentAction?.(item, documentType, action)
              }
            />
          );
          */
          return (
            <DocumentSlotViewer
              documents={row.original?.document_slots?.swift?.documents}
              emails={row.original?.document_slots?.swift?.emails}
              slotName="swift"
              slotLabel="Swift"
              offerId={row.original?._id}
              userRole={userRole}
              showUpload={true}
              columnId="swift_id"
              selectedItems={selectedItems}
              onBulkDownload={handleBulkDownload}
            />
          );
        },
      }
    );
  }

  // Add ALL document columns for 'all' progress dashboard
  if (dashboardType === DashboardType.ALL || selectedProgressFilter === 'all') {
    // Offer stage documents
    baseColumns.push({
      id: 'offer_contract_all',
      header: 'Offer',
      enableSorting: true,
      columnWidth: 83,
      cell: ({ row }) => {
        const rowData = row.original?.files;
        const filterFiles = rowData?.find(
          (file: any) => file?.type === DOCUMENT_TYPES?.OFFER_CONTRACT
        );
        return (
          <FileHandler
            offerId={row.original?._id}
            table="offers"
            type={DOCUMENT_TYPES.OFFER_CONTRACT}
            section={filterFiles}
            isFileUploading={isFileUploading}
            headerInfo={{
              column: 'offer contract',
              leadName: row.original?.leadName,
              table: 'all',
            }}
            handleFileUpload={(id, files) =>
              handleFileUpload?.(id, files, 'offers', DOCUMENT_TYPES.OFFER_CONTRACT, row.original)
            }
            handleDocumentAction={(item, documentType, action) =>
              handleDocumentAction?.(item, documentType, action)
            }
            columnId="offer_contract_all"
            selectedItems={selectedItems}
            onBulkDownload={handleBulkDownload}
          />
        );
      },
    });

    // Opening stage documents
    baseColumns.push(
      {
        id: 'opening_contract_all',
        header: 'Con.',
        accessorKey: 'opening_contract_all',
        enableSorting: true,
        columnWidth: 86,
        minSize: 86,
        cell: ({ row }) => {
          // const rowData = row.original?.files;
          // const filterFiles = rowData?.find(
          //   (file: any) => file?.type === DOCUMENT_TYPES?.OPENING_CONTRACT
          // );
          // return (
          //   <FileHandler
          //     offerId={row.original?._id}
          //     table="offers"
          //     type={DOCUMENT_TYPES.OPENING_CONTRACT}
          //     section={filterFiles}
          //     isFileUploading={isFileUploading}
          //     headerInfo={{
          //       column: 'opening contract',
          //       leadName: row.original?.leadName,
          //       table: 'all',
          //     }}
          //     handleFileUpload={(id, files) =>
          //       handleFileUpload?.(
          //         id,
          //         files,
          //         'offers',
          //         DOCUMENT_TYPES?.OPENING_CONTRACT,
          //         row.original
          //       )
          //     }
          //     handleDocumentAction={(item, documentType, action) =>
          //       handleDocumentAction?.(item, documentType, action)
          //     }
          //   />
          // );
          return (
            <DocumentSlotViewer
              documents={row.original?.document_slots?.contract?.documents}
              emails={row.original?.document_slots?.contract?.emails}
              slotName="contract"
              slotLabel="Contract"
              offerId={row.original?._id}
              userRole={userRole}
              showUpload={true}
              columnId="opening_contract_all"
              selectedItems={selectedItems}
              onBulkDownload={handleBulkDownload}
            />
          );
        },
      },
      {
        id: 'opening_id_all',
        header: 'ID',
        enableSorting: false,
        columnWidth: 100,
        minSize: 86,
        accessorKey: 'opening_id_all',
        cell: ({ row }) => {
          /*
          const rowData = row.original?.files;
          const filterFiles = rowData?.find(
            (file: any) => file?.type === DOCUMENT_TYPES?.OPENING_ID
          );
          return (
            <FileHandler
              offerId={row.original?._id}
              table="offers"
              type={DOCUMENT_TYPES?.OPENING_ID}
              section={filterFiles}
              isFileUploading={isFileUploading}
              headerInfo={{
                column: 'opening Id',
                leadName: row.original?.leadName,
                table: 'all',
              }}
              handleFileUpload={(id, files) =>
                handleFileUpload?.(id, files, 'offers', DOCUMENT_TYPES?.OPENING_ID, row.original)
              }
              handleDocumentAction={(item, documentType, action) =>
                handleDocumentAction?.(item, documentType, action)
              }
            />
          );
          */
          return (
            <DocumentSlotViewer
              documents={row.original?.document_slots?.id_files?.documents}
              emails={row.original?.document_slots?.id_files?.emails}
              slotName="id_files"
              slotLabel="ID Files"
              offerId={row.original?._id}
              userRole={userRole}
              showUpload={true}
              columnId="opening_id_all"
              selectedItems={selectedItems}
              onBulkDownload={handleBulkDownload}
            />
          );
        },
      }
    );

    // Confirmation stage documents
    baseColumns.push({
      id: 'confirmation_contract_all',
      header: 'Ann.',
      enableSorting: false,
      columnWidth: 84,
      cell: ({ row }) => {
        /*
        const rowData = row.original?.files;
        const filterFiles = rowData?.find(
          (file: any) => file?.type === DOCUMENT_TYPES?.CONFIRMATION_CONTRACT
        );
        return (
          <FileHandler
            offerId={row.original?._id}
            table="offers"
            type={DOCUMENT_TYPES?.CONFIRMATION_CONTRACT}
            section={filterFiles}
            isFileUploading={isFileUploading}
            headerInfo={{
              column: 'confirmation contract',
              leadName: row.original?.leadName,
              table: 'all',
            }}
            handleFileUpload={(id, files) =>
              handleFileUpload?.(
                id,
                files,
                'offers',
                DOCUMENT_TYPES?.CONFIRMATION_CONTRACT,
                row.original
              )
            }
            handleDocumentAction={(item, documentType, action) =>
              handleDocumentAction?.(item, documentType, action)
            }
          />
        );
        */
        return (
          <DocumentSlotViewer
            documents={row.original?.document_slots?.annahme?.documents}
            emails={row.original?.document_slots?.annahme?.emails}
            slotName="annahme"
            slotLabel="Annahme"
            offerId={row.original?._id}
            userRole={userRole}
            showUpload={true}
            columnId="confirmation_contract_all"
            selectedItems={selectedItems}
            onBulkDownload={handleBulkDownload}
          />
        );
      },
    });

    // Payment stage documents
    baseColumns.push({
      id: 'payment_contract_all',
      header: 'Swift',
      enableSorting: true,
      columnWidth: 85,
      cell: ({ row }) => {
        /*
        const rowData = row.original?.files;
        const filterFiles = rowData?.find(
          (file: any) => file?.type === DOCUMENT_TYPES?.PAYMENT_CONTRACT
        );
        return (
          <FileHandler
            offerId={row.original?._id}
            table="offers"
            type={DOCUMENT_TYPES?.PAYMENT_CONTRACT}
            section={filterFiles}
            isFileUploading={isFileUploading}
            headerInfo={{
              column: 'swift',
              leadName: row.original?.leadName,
              table: 'all',
            }}
            handleFileUpload={(id, files) =>
              handleFileUpload?.(
                id,
                files,
                'offers',
                DOCUMENT_TYPES?.PAYMENT_CONTRACT,
                row.original
              )
            }
            handleDocumentAction={(item, documentType, action) =>
              handleDocumentAction?.(item, documentType, action)
            }
          />
        );
        */
        return (
          <DocumentSlotViewer
            documents={row.original?.document_slots?.swift?.documents}
            emails={row.original?.document_slots?.swift?.emails}
            slotName="swift"
            slotLabel="Swift"
            offerId={row.original?._id}
            userRole={userRole}
            showUpload={true}
            columnId="payment_contract_all"
            selectedItems={selectedItems}
            onBulkDownload={handleBulkDownload}
          />
        );
      },
    });

    // Netto1 Email
    baseColumns.push({
      id: 'netto1_email_all',
      header: 'N1 Mail',
      enableSorting: false,
      columnWidth: 87,
      cell: ({ row }) => {
        const rowData = row.original?.files;
        const filterFiles = rowData?.find(
          (file: any) => file?.type === DOCUMENT_TYPES?.NETTO1_EMAIL
        );
        return (
          <FileHandler
            offerId={row.original?._id}
            table="offers"
            type={DOCUMENT_TYPES?.NETTO1_EMAIL}
            section={filterFiles}
            isFileUploading={isFileUploading}
            headerInfo={{
              column: 'netto1 mail',
              leadName: row.original?.leadName,
              table: 'all',
            }}
            handleFileUpload={(id, files) =>
              handleFileUpload?.(id, files, 'offers', DOCUMENT_TYPES?.NETTO1_EMAIL, row.original)
            }
            handleDocumentAction={(item, documentType, action) =>
              handleDocumentAction?.(item, documentType, action)
            }
            columnId="netto1_email_all"
            selectedItems={selectedItems}
            onBulkDownload={handleBulkDownload}
          />
        );
      },
    });

    // Netto2 Email
    baseColumns.push({
      id: 'netto2_email_all',
      header: 'N2 Mail',
      enableSorting: true,
      columnWidth: 85,
      cell: ({ row }) => {
        const rowData = row.original?.files;
        const filterFiles = rowData?.find(
          (file: any) => file?.type === DOCUMENT_TYPES?.NETTO2_EMAIL
        );
        return (
          <FileHandler
            offerId={row.original?._id}
            table="offers"
            type={DOCUMENT_TYPES?.NETTO2_EMAIL}
            section={filterFiles}
            isFileUploading={isFileUploading}
            headerInfo={{
              column: 'netto2 mail',
              leadName: row.original?.leadName,
              table: 'all',
            }}
            handleFileUpload={(id, files) =>
              handleFileUpload?.(id, files, 'offers', DOCUMENT_TYPES?.NETTO2_EMAIL, row.original)
            }
            handleDocumentAction={(item, documentType, action) =>
              handleDocumentAction?.(item, documentType, action)
            }
            columnId="netto2_email_all"
            selectedItems={selectedItems}
            onBulkDownload={handleBulkDownload}
          />
        );
      },
    });
  }

  // Add ticket-specific columns for offer_tickets dashboard
  if (dashboardType === DashboardType.OFFER_TICKETS) {
    // BO column - shows who's assigned to the ticket
    baseColumns.push({
      id: 'ticket_bo',
      header: () => <span className="whitespace-nowrap">BO</span>,
      accessorKey: 'ticketAssignedTo',
      enableSorting: true,
      maxSize: 100,
      cell: ({ row }: { row: any }) => {
        const assignedTo = row.original?.ticketAssignedTo;
        if (!assignedTo) {
          return <span className="text-gray-400 italic">Unassigned</span>;
        }
        return <AgentBatch agentName={assignedTo.login} agentColor={assignedTo.color_code} />;
      },
    });

    // Ticket Status column - shows pending/in_progress/done
    baseColumns.push({
      id: 'ticket_status',
      header: () => <span className="whitespace-nowrap">Status</span>,
      accessorKey: 'ticketStatus',
      enableSorting: true,
      maxSize: 100,
      cell: ({ row }: { row: any }) => {
        const status = row.original?.ticketStatus;
        const getStatusStyle = (s: string) => {
          switch (s) {
            case 'pending':
              return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'in_progress':
              return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'done':
              return 'bg-green-100 text-green-700 border-green-200';
            default:
              return 'bg-gray-100 text-gray-700 border-gray-200';
          }
        };
        const getStatusLabel = (s: string) => {
          switch (s) {
            case 'pending':
              return 'Pending';
            case 'in_progress':
              return 'In Progress';
            case 'done':
              return 'Done';
            default:
              return s || '-';
          }
        };
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}
          >
            {getStatusLabel(status)}
          </span>
        );
      },
    });

    // Todo/Ticket Message column - use TodoList component like Lead Tickets
    baseColumns.push({
      id: 'ticket_message',
      header: () => <span className="whitespace-nowrap">Todo</span>,
      accessorKey: 'ticketMessage',
      enableSorting: true,
      cell: ({ row }: { row: any }) => {
        // Transform ticket data to match TodoList expected format
        const ticket = row.original?.ticket;
        if (!ticket) return <span className="text-gray-400">-</span>;

        // Create activeTodos array from the ticket
        const activeTodos = [
          {
            _id: ticket._id,
            message: ticket.message || row.original?.ticketMessage || '',
            isDone: ticket.isDone || false,
            active: true,
            creator: ticket.creator || { _id: '', login: '', role: '' },
            assignedTo: ticket.assignedTo,
            createdAt: ticket.createdAt || '',
            updatedAt: ticket.updatedAt || '',
            dateOfDoneTime: ticket.dateOfDone || null,
            type: ticket.type || 'Ticket',
          },
        ];

        return (
          <TodoList
            activeTodos={activeTodos}
            author={sessionUserName || ''}
            todoId={row.original?.leadId || row.original?._id}
            updateTodo={updateTodo || (async () => {})}
            onTodoClick={onTodoClick}
            assignButton={false}
          />
        );
      },
    });
  }

  return baseColumns;
};

export default SharedColumnConfig;

// Hook interface for the column configuration
interface UseSharedColumnConfigProps {
  expandedRowId: string;
  handleExpanderToggle: (id: string) => void;
  onOpenDocsModal: (rowData: any) => void;
  onEditOffer?: (rowData: any) => void;
  dashboardType: TDashboardType;
  selectedProgressFilter?: TDashboardType;
  userRole?: string;
  isFileUploading?: (id: string, documentType: string, table: string) => boolean;
  handleFileUpload?: (
    id: string,
    files: File[] | null | undefined,
    table?: string,
    fileType?: string,
    fullItem?: any
  ) => void;
  handleDocumentAction?: (
    item: any,
    documentType: string,
    action: 'preview' | 'download' | 'delete'
  ) => void;
  handleBulkDownload?: (columnId: string) => void;
  selectedItems?: any[];
  onOpenPdfModal?: (rowData: any) => void;
  bonusAmountOptions?: any;
  paymentTermOptions?: any;
  negativeAndPrivatOptions?: any;
  updateTodo?: (id: string, updates: { isDone?: boolean; message?: string }) => Promise<void>;
  onTodoClick?: (taskId: string) => void;
  sessionUserName?: string;
  onOpenOpeningDetails?: (rowData: any) => void;
}

/**
 * Hook for SharedColumnConfig that provides instant updates without memoization
 * This ensures that any changes are immediately reflected in the display
 * without waiting for dependency changes or memoization cache invalidation
 */
export const useSharedColumnConfig = (props: UseSharedColumnConfigProps): ColumnDef<any>[] => {
  const {
    expandedRowId,
    handleExpanderToggle,
    onOpenDocsModal,
    onEditOffer,
    dashboardType,
    selectedProgressFilter,
    userRole,
    isFileUploading,
    handleFileUpload,
    handleDocumentAction,
    handleBulkDownload,
    selectedItems,
    onOpenPdfModal,
    bonusAmountOptions,
    paymentTermOptions,
    negativeAndPrivatOptions,
    updateTodo,
    onTodoClick,
    sessionUserName,
    onOpenOpeningDetails,
  } = props;

  // Direct call to SharedColumnConfig without memoization for instant updates
  return SharedColumnConfig({
    expandedRowId,
    handleExpanderToggle,
    onOpenDocsModal,
    onEditOffer,
    dashboardType,
    selectedProgressFilter,
    userRole,
    isFileUploading,
    handleFileUpload,
    handleDocumentAction,
    handleBulkDownload,
    selectedItems,
    onOpenPdfModal,
    bonusAmountOptions,
    paymentTermOptions,
    negativeAndPrivatOptions,
    updateTodo,
    onTodoClick,
    sessionUserName,
    onOpenOpeningDetails,
  });
};
