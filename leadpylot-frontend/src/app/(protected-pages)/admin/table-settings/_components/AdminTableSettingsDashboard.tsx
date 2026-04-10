'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Notification from '@/components/ui/Notification';
import Badge from '@/components/ui/Badge';
import toast from '@/components/ui/toast'; // assuming these exist in your design system
import { DraggableColumnList } from '@/app/(protected-pages)/dashboards/leads/_components/DraggableColumnList';
import { useQuery } from '@tanstack/react-query';
import { useColumnOrderStore } from '@/stores/columnOrderStore';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import TableSettingsManager from './grouping/TableSettingsManager';
import {
  apiSaveColumnPreference,
  AdminColumnPreferencePayload,
  apiSaveColumnPreferenceDefault,
  apiGetColumnPreferenceByUser,
  apiGetMultipleUsersColumnPreference,
  GetMultipleUsersColumnPreferenceRequest,
  UserColumnPreferenceData,
} from '@/services/LeadsService';
import { apiGetUsers } from '@/services/UsersService';
import classNames from '@/components/ui/utils/classNames';
import { Role } from '@/configs/navigation.config/auth.route.config';

export const LABELS: Record<string, string> = {
  leadName: 'Lead',
  project_name: 'project',
  lead_source_no: 'Lead ID',
  source_id: 'Source',
  source_agent: 'Source Agent',
  contact_name: 'Contact',
  phone: 'Phone',
  email_from: 'Email',
  expected_revenue: 'Rev',
  status: 'Status',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
  lead_date: 'Lead At',
  assigned_date: 'Assigned',
  // new columns for offers
  partnerId: 'Lead ID',
  investmentVolume: 'Inv',
  interestMonth: 'Mon',
  bankName: 'Bank',
  bonusAmount: 'Bon',
  projectName: 'Project',
  leadEmail: 'Lead Email',
  interest_rate: 'Rate',
  investment_volume: 'Inv',
  lead_status: 'Lead Status',
  contract_id: 'Con.',
  agent: 'Agent',
  id_confirmation: 'ID',
  annah_id: 'Ann.',
  swift_id: 'Swift',
  reference_no: 'Reference No',
  appointment_date: 'Appointment Date',
  appointment_description: 'Appointment Description',
  filename: 'Document Name',
  assigne: 'Assign',
  size: 'Size',
  type: 'Type',
  offerType: 'Type',
  offer_calls: 'Calls',
  offer_status: 'Offer Status',
  load_and_opening: 'O/L',
  description: 'Description',
  imp_status: 'IMP',
  todo: 'Todo',
  lead_source: 'Src',
  nickName: 'Bank Nickname',
  month: 'Month',
  flex_option: 'Flex',
  nametitle: 'Title',
  scheduled_date: 'Scheduled Date',
  scheduled_time: 'Scheduled Time',
  handover_notes: 'Notes',
  ticket_bo: 'BO',
  ticket_status: 'Ticket Status',
  ticket_message: 'Todo',
  prev_agent: 'Prev Agent',
  prev_project: 'Prev Project',
  source_project: 'Source Project',
  use_status: 'Use Status',
  // All progress columns
  offer_contract_all: 'Offer',
  opening_contract_all: 'Con.',
  opening_id_all: 'ID',
  confirmation_contract_all: 'Ann.',
  payment_contract_all: 'Swift',
  netto1_email_all: 'N1 Mail',
  netto2_email_all: 'N2 Mail',
  bankNickName: 'Bank Nickname',
  actions: 'Actions',
};

// Route selector for pages admin wants to control
type RouteKey =
  | 'dashboards/leads'
  | 'dashboards/leads/pending-leads'
  | 'dashboards/leads/archived'
  | 'dashboards/live-leads'
  | 'dashboards/scheduled-leads'
  | 'dashboards/recycle-leads'
  // | 'dashboards/holds'
  | 'dashboards/todo'
  | 'dashboards/documents'
  | 'dashboards/offers'
  | 'dashboards/openings'
  | 'dashboards/reclamations'
  | 'dashboards/calendar'
  | 'dashboards/termin'
  | 'dashboards/tickets'
  | 'dashboards/leads/lead-offers';

const ROUTE_OPTIONS: Array<{ value: RouteKey; label: string; role: Role[] }> = [
  { value: 'dashboards/leads', label: 'Leads', role: [Role.ADMIN, Role.AGENT] },
  { value: 'dashboards/leads/pending-leads', label: 'Pending Leads', role: [Role.ADMIN] },
  { value: 'dashboards/leads/archived', label: 'Archived Leads', role: [Role.ADMIN] },
  { value: 'dashboards/live-leads', label: 'Live', role: [Role.ADMIN, Role.AGENT] },
  {
    value: 'dashboards/scheduled-leads',
    label: 'Scheduled Leads' as unknown as RouteKey,
    role: [Role.ADMIN],
  },
  { value: 'dashboards/recycle-leads', label: 'Recycle', role: [Role.ADMIN, Role.AGENT] },
  { value: 'dashboards/todo', label: 'Todo', role: [Role.ADMIN] },
  { value: 'dashboards/documents', label: 'Documents', role: [Role.ADMIN] },
  { value: 'dashboards/offers', label: 'Offers', role: [Role.ADMIN, Role.AGENT] },
  { value: 'dashboards/openings', label: 'Openings', role: [Role.ADMIN, Role.AGENT] },
  { value: 'dashboards/reclamations', label: 'Reclamations', role: [Role.ADMIN] },
  // { value: 'dashboards/holds', label: 'Hold', role: [Role.ADMIN] },
  { value: 'dashboards/calendar', label: 'Calendar', role: [Role.ADMIN, Role.AGENT] },
  { value: 'dashboards/termin', label: 'Termin', role: [Role.ADMIN, Role.AGENT] },
  { value: 'dashboards/tickets', label: 'Ticket', role: [Role.ADMIN, Role.AGENT] },
  { value: 'dashboards/leads/lead-offers', label: 'Lead Offers', role: [Role.ADMIN, Role.AGENT] },
];

// Table keys used by individual pages
type TableKey =
  | 'leads'
  | 'pending-leads'
  | 'archived-leads'
  | 'live_leads'
  | 'scheduled_leads'
  | 'termin'
  // | 'holds'
  | 'recycle_leads'
  | 'todo_leads'
  | 'library-documents'
  | 'offers'
  | 'openings'
  | 'confirmations'
  | 'payments'
  | 'netto1'
  | 'netto2'
  | 'lost'
  | 'all'
  | 'reclamations'
  | 'tickets'
  | 'lead_tickets'
  | 'offer_tickets'
  | 'lead-offers-table';

const routeToTableKey = (
  route: string,
  subtype: 'openings' | 'confirmations' | 'payments' | 'all' | 'lead_tickets' | 'offer_tickets' | string
): TableKey => {
  switch (route) {
    case 'dashboards/leads':
      return 'leads';
    case 'dashboards/leads/pending-leads':
      return 'pending-leads';
    case 'dashboards/leads/archived':
      return 'archived-leads';
    case 'dashboards/live-leads':
      return 'live_leads';
    case 'dashboards/recycle-leads':
      return 'recycle_leads';
    case 'dashboards/termin':
      return 'termin';
    // case 'dashboards/holds':
    //   return 'holds';
    case 'dashboards/todo':
      return 'todo_leads';
    case 'dashboards/documents':
      return 'library-documents';
    case 'dashboards/offers':
      return 'offers';
    case 'dashboards/openings':
      return subtype as 'openings' | 'confirmations' | 'payments' | 'all';
    case 'dashboards/reclamations':
      return 'reclamations';
    case 'dashboards/tickets':
      return (subtype === 'lead_tickets' || subtype === 'offer_tickets' ? subtype : 'lead_tickets') as 'lead_tickets' | 'offer_tickets';
    case 'dashboards/leads/lead-offers':
      return 'lead-offers-table';
    default:
      return 'leads';
  }
};

const Pill = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={classNames(
      'inline-flex items-center justify-center rounded-md px-4 py-0.5 text-sm font-medium transition-colors duration-200 ease-in-out',
      active
        ? 'text-primary border-primary/20 border bg-white shadow-sm'
        : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
    )}
  >
    {children}
  </button>
);

const SectionHeader = ({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <h2 className="text-base leading-tight font-semibold">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const AdminTableSettingsDashboard = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedRoute, setSelectedRoute] = useState<string>('dashboards/tickets');
  const [selectedSubtype, setSelectedSubtype] = useState<string>('ticket_leads');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAllUsersSelected, setIsAllUsersSelected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'perUser' | 'default' | 'grouping'>(() => {
    return searchParams.get('grouping-setting') === 'true' ? 'grouping' : 'default';
  });
  const [userPreferencesData, setUserPreferencesData] = useState<UserColumnPreferenceData[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>(Role.AGENT);
  const [showOpeningsStages, setShowOpeningsStages] = useState<boolean>(false);

  // Grouping settings save state
  const [groupingCanSave, setGroupingCanSave] = useState(false);
  const [groupingHandleSave, setGroupingHandleSave] = useState<(() => void) | null>(null);
  const [groupingIsSaving, setGroupingIsSaving] = useState(false);

  const effectiveTableKey = useMemo(
    () => routeToTableKey(selectedRoute, selectedSubtype as any),
    [selectedRoute, selectedSubtype]
  );

  // Filter routes by selected role (only when activeTab is 'perUser')
  const filteredRoutes = useMemo(() => {
    if (activeTab === 'default') return ROUTE_OPTIONS;
    // Filter by role when perUser tab is selected
    return ROUTE_OPTIONS.filter(
      (route: any) => route.role && Array.isArray(route.role) && route.role.includes(selectedRole)
    );
  }, [selectedRole, activeTab]);

  // Reset selectedRoute if not in filtered list
  useEffect(() => {
    if (!filteredRoutes.some((r) => r.value === selectedRoute)) {
      setSelectedRoute(filteredRoutes[0]?.value || 'dashboards/leads');
    }
  }, [filteredRoutes, selectedRoute]);

  useEffect(() => {
    if (selectedRoute !== 'dashboards/openings') {
      setShowOpeningsStages(false);
    }
    if (selectedRoute !== 'dashboards/tickets') {
      // Reset ticket subtype when leaving tickets route
      if (selectedRoute !== 'dashboards/openings') {
        setSelectedSubtype('ticket_leads');
      }
    }
  }, [selectedRoute]);

  // Sync URL query param when tab changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeTab === 'grouping') {
      params.set('grouping-setting', 'true');
    } else {
      params.delete('grouping-setting');
    }
    const newQuery = params.toString();
    router.push(newQuery ? `${pathname}?${newQuery}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pathname, router]);

  // Reset subtype when route changes
  useEffect(() => {
    const selectedRouteData = filteredRoutes.find((t) => t.value === selectedRoute);
    // Check for 'child' property, which may not exist on type; fallback to undefined if not present
    const childRoutes =
      selectedRouteData && 'child' in selectedRouteData
        ? (selectedRouteData as any).child
        : undefined;

    if (childRoutes && Array.isArray(childRoutes) && childRoutes.length > 0) {
      // Set default to first child's tblKey
      setSelectedSubtype(childRoutes[0]?.tblKey || 'openings');
    } else if (selectedRoute === 'dashboards/tickets') {
      // Set default to ticket_leads for tickets route
      setSelectedSubtype('ticket_leads');
    } else if (selectedRoute === 'dashboards/openings') {
      // Set default to openings for openings route
      setSelectedSubtype('openings');
    } else {
      // Reset to default for routes without children
      setSelectedSubtype('openings');
    }
  }, [selectedRoute, filteredRoutes]);

  const columnItems = useMemo(() => {
    // Specify columns explicitly by page
    const LEADS_BASE = [
      'project_name',
      'lead_source_no',
      'contact_name',
      'phone',
      'email_from',
      'expected_revenue',
      'status',
      'createdAt',
      'updatedAt',
      'lead_date',
      'assigned_date',
      'agent',
      'lead_source',
    ];
    const OFFERS_BASE = [
      // 'agent',
      'leadName',
      'projectName',
      'partnerId',
      'leadEmail',
      'phone',
      'bankName',
      'nickName',
      'investment_volume',
      'interest_rate',
      'interestMonth',
      'bonusAmount',
      'source_id',
      // 'lead_status',
      'offer_status',
      'offerType',
      'updatedAt',
      'createdAt',
      'email',
    ];

    const FALLBACKS: Record<TableKey, string[]> = {
      leads: LEADS_BASE,
      'pending-leads': [...LEADS_BASE, 'status'],
      'archived-leads': [...LEADS_BASE, 'status'],
      live_leads: [...LEADS_BASE],
      scheduled_leads: [...LEADS_BASE, 'status'],
      recycle_leads: [...LEADS_BASE],
      todo_leads: [...LEADS_BASE, 'todo'],
      termin: [
        'description',
        'appointment_date',
        'agent',
        ...LEADS_BASE,
        'source_agent',
        'imp_status',
        'appointment_description',
      ],
      'library-documents': ['filename', 'type', 'updatedAt', 'size', 'assigned'],
      // holds: ['appointment_description', 'appointment_date', ...LEADS_BASE],
      offers: [...OFFERS_BASE, 'load_and_opening', 'offer_calls', 'status', 'offer', 'pdf'],
      openings: [
        ...OFFERS_BASE,
        'load_and_opening',
        'contract_id',
        'id_confirmation',
        'annah_id',
        'swift_id',
      ],
      confirmations: [...OFFERS_BASE, 'reference_no'],
      payments: [
        ...OFFERS_BASE,
        'contract_id',
        'id_confirmation',
        'annah_id',
        'swift_id',
        'reference_no',
      ],
      netto1: [...OFFERS_BASE, 'reference_no'],
      netto2: [...OFFERS_BASE, 'reference_no'],
      lost: [...OFFERS_BASE, 'reference_no'],
      all: [
        ...OFFERS_BASE,
        'reference_no',
        'offer_contract_all',
        'opening_contract_all',
        'opening_id_all',
        'confirmation_contract_all',
        'payment_contract_all',
        'netto1_email_all',
        'netto2_email_all',
      ],
      reclamations: ['leadName', 'projectName', 'updatedAt', 'status'],
      tickets: [...LEADS_BASE, 'source_agent', 'todo'],
      lead_tickets: [...LEADS_BASE, 'imp_status', 'use_status', 'source_agent', 'todo', 'prev_agent', 'prev_project', 'source_project',],
      offer_tickets: [...OFFERS_BASE, 'ticket_bo', 'ticket_status', 'ticket_message', 'reference_no',],
      'lead-offers-table': [
        'agent',
        'investment_volume',
        'month',
        'interest_rate',
        'bonusAmount',
        'bankName',
        'bankNickName',
        'offerType',
        'flex_option',
        'nametitle',
        'status',
        'createdAt',
        'scheduled_date',
        'scheduled_time',
        'handover_notes',
        'actions',
      ],
    };

    const keys = FALLBACKS[effectiveTableKey] || [];
    return keys.map((k) => ({
      key: k,
      label: LABELS[k] ?? k,
      isVisible: true,
    }));
  }, [effectiveTableKey]);

  // local working state
  const [localOrder, setLocalOrder] = useState<string[]>(() => columnItems.map((c) => c.key));
  const [localVisibility, setLocalVisibility] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    columnItems.forEach((c) => (init[c.key] = true));
    return init;
  });

  // reset local state when context changes
  useEffect(() => {
    const keys = columnItems.map((c) => c.key);
    setLocalOrder(keys);
    setLocalVisibility(
      keys.reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<string, boolean>)
    );
  }, [columnItems]);

  // Users query with infinite scroll pagination
  const [usersPage, setUsersPage] = useState(1);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const { data: usersData, isLoading: isInitialLoading } = useQuery({
    queryKey: ['users', selectedRole, usersPage],
    queryFn: () => apiGetUsers({ page: usersPage, limit: 100, role: selectedRole }), // Increased limit to 100
    enabled: usersPage === 1, // Only fetch first page with useQuery
  });

  // Load more users function for infinite scroll
  const loadMoreUsers = useCallback(async () => {
    if (isLoadingUsers || !hasMoreUsers) return;

    setIsLoadingUsers(true);
    try {
      const nextPage = usersPage + 1;
      const response = await apiGetUsers({ page: nextPage, limit: 100, role: selectedRole });

      if (response?.data && response.data.length > 0) {
        setAllUsers((prev) => [...prev, ...response.data]);
        setUsersPage(nextPage);
        setHasMoreUsers(response.data.length === 100); // If less than 100, no more pages
      } else {
        setHasMoreUsers(false);
      }
    } catch {
      // Error loading more users - stop pagination
      setHasMoreUsers(false);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [usersPage, selectedRole, isLoadingUsers, hasMoreUsers]);

  // Reset users when role changes
  useEffect(() => {
    setAllUsers([]);
    setUsersPage(1);
    setHasMoreUsers(true);
  }, [selectedRole]);

  // Update allUsers when initial data loads
  useEffect(() => {
    if (usersData?.data && usersPage === 1) {
      setAllUsers(usersData.data);
      setHasMoreUsers(usersData.data.length === 100); // Check against new limit
    }
  }, [usersData?.data, usersPage]);

  const userOptions = useMemo(() => {
    const list = allUsers.map((u: any) => ({
      value: u._id || u.id,
      label: u?.info?.name || u?.name || u?.login,
    }));

    const newValue = [{ value: 'all', label: 'All Users' }, ...list];
    return newValue;
  }, [allUsers]);

  const { isDragModeEnabled } = useColumnOrderStore.getState() as any;

  const openingsStages = useMemo(
    () => [
      { value: 'openings', label: 'Contract' },
      { value: 'confirmations', label: 'Confirmation' },
      { value: 'payments', label: 'Payment' },
      { value: 'netto1', label: 'Netto 1' },
      { value: 'netto2', label: 'Netto 2' },
      { value: 'lost', label: 'Lost' },
      { value: 'all', label: 'All' },
    ],
    []
  );

  const ticketTypes = useMemo(
    () => [
      { value: 'ticket_leads', label: 'Lead tickets' },
      { value: 'offer_tickets', label: 'Offer Tickets' },
    ],
    []
  );

  const handleUserSelectionChange = (opts: any) => {
    const selectedValues = (opts || []).map((o: any) => o.value);
    const hasAllSelected = selectedValues.includes('all');

    setIsAllUsersSelected(hasAllSelected);

    if (hasAllSelected) setSelectedUserIds(['all']);
    else setSelectedUserIds(selectedValues);
  };

  const handleClearAllUsers = () => {
    setIsAllUsersSelected(false);
    setSelectedUserIds([]);
  };

  // Loading states for save operations
  const [isSavingPerUser, setIsSavingPerUser] = useState(false);
  const [isSavingDefault, setIsSavingDefault] = useState(false);

  const hasChanges = useMemo(() => {
    // For now consider any tweak as change; in real app compare to stored settings
    return true;
  }, []);

  const handleSave = async () => {
    if (!selectedUserIds.length) {
      toast.push(
        React.createElement(
          Notification as any,
          { type: 'warning', title: 'No users selected' },
          'Please select one or more users.'
        )
      );
      return;
    }
    if (!localOrder.length) {
      toast.push(
        React.createElement(
          Notification as any,
          { type: 'warning', title: 'No columns' },
          'No columns available to save.'
        )
      );
      return;
    }

    const columnOrders: Record<string, string[]> = { [effectiveTableKey]: localOrder } as any;
    const columnVisibility: Record<string, Record<string, boolean>> = {
      [effectiveTableKey]: localVisibility,
    } as any;

    const payload: AdminColumnPreferencePayload = {
      user_ids: selectedUserIds,
      data: {
        columnOrders,
        columnVisibility,
        isDragModeEnabled: Boolean(isDragModeEnabled),
        hasHydrated: true,
      },
    };

    setIsSavingPerUser(true);
    try {
      const res = await apiSaveColumnPreference(payload);

      // Check success flag from backend
      if (res?.success === false) {
        toast.push(
          React.createElement(
            Notification as any,
            { type: 'danger', title: 'Save failed' },
            res?.message || 'Failed to update column preferences.'
          )
        );
        return;
      }

      // Show success with details about how many users were updated
      const successCount = res?.results?.filter((r) => !r.error).length || 0;
      const failedCount = res?.results?.filter((r) => r.error).length || 0;

      if (failedCount > 0) {
        toast.push(
          React.createElement(
            Notification as any,
            { type: 'warning', title: 'Partially saved' },
            `Updated ${successCount} users. ${failedCount} failed.`
          )
        );
      } else {
        toast.push(
          React.createElement(
            Notification as any,
            { type: 'success', title: 'Saved' },
            res?.message || 'Column preferences updated successfully.'
          )
        );
      }
    } catch (e: any) {
      toast.push(
        React.createElement(
          Notification as any,
          { type: 'danger', title: 'Save failed' },
          e?.response?.data?.message || e?.message || 'Failed to update column preferences.'
        )
      );
    } finally {
      setIsSavingPerUser(false);
    }
  };

  const handleSaveDefault = async () => {
    if (!localOrder.length) {
      toast.push(
        React.createElement(
          Notification as any,
          { type: 'warning', title: 'No columns' },
          'No columns available to save.'
        )
      );
      return;
    }

    const columnOrders: Record<string, string[]> = { [effectiveTableKey]: localOrder } as any;
    const columnVisibility: Record<string, Record<string, boolean>> = {
      [effectiveTableKey]: localVisibility,
    } as any;

    const payload: AdminColumnPreferencePayload = {
      user_ids: [], // defaults apply globally; no users needed
      data: {
        columnOrders,
        columnVisibility,
        isDragModeEnabled: Boolean(isDragModeEnabled),
        hasHydrated: true,
      },
    };

    setIsSavingDefault(true);
    try {
      const res = await apiSaveColumnPreferenceDefault(payload);

      // Check success flag from backend
      if (res?.success === false) {
        toast.push(
          React.createElement(
            Notification as any,
            { type: 'danger', title: 'Save failed' },
            res?.message || 'Failed to update default column preferences.'
          )
        );
        return;
      }

      toast.push(
        React.createElement(
          Notification as any,
          { type: 'success', title: 'Default saved' },
          res?.message || 'Default column preferences updated successfully.'
        )
      );
    } catch (e: any) {
      toast.push(
        React.createElement(
          Notification as any,
          { type: 'danger', title: 'Save failed' },
          e?.response?.data?.message || e?.message || 'Failed to update default column preferences.'
        )
      );
    } finally {
      setIsSavingDefault(false);
    }
  };

  // Handle individual user preferences save
  const handleSaveUserPreferences = async (
    userId: string,
    userName: string,
    columnOrder: string[],
    columnVisibility: Record<string, boolean>
  ) => {
    const columnOrders: Record<string, string[]> = { [effectiveTableKey]: columnOrder };
    const columnVisibilityData: Record<string, Record<string, boolean>> = {
      [effectiveTableKey]: columnVisibility,
    };

    const payload: AdminColumnPreferencePayload = {
      user_ids: [userId],
      data: {
        columnOrders,
        columnVisibility: columnVisibilityData,
        isDragModeEnabled: Boolean(isDragModeEnabled),
        hasHydrated: true,
      },
    };

    try {
      const saveRes = await apiSaveColumnPreference(payload);
      
      // Check success flag from backend
      if (saveRes?.success === false) {
        toast.push(
          React.createElement(
            Notification as any,
            { type: 'danger', title: 'Save failed' },
            saveRes?.message || `Failed to update column preferences for ${userName}.`
          )
        );
        return;
      }

      toast.push(
        React.createElement(
          Notification as any,
          { type: 'success', title: 'Saved' },
          saveRes?.message || `Column preferences updated for ${userName}.`
        )
      );

      // Refresh user preferences data
      const refreshPayload = {
        table: effectiveTableKey,
        user_ids: selectedUserIds,
        role: selectedRole,
      };
      const res = await apiGetMultipleUsersColumnPreference(refreshPayload);
      
      // Check success flag
      if (res?.success === false) {
        console.warn('Failed to refresh user preferences:', res?.message);
        return;
      }

      if (res?.results && res.results.length > 0) {
        const tableResult = res.results.find((result) => result.table === effectiveTableKey);
        if (tableResult?.data && Array.isArray(tableResult.data)) {
          // Filter out any malformed data entries
          const validData = tableResult.data.filter(
            (item) => item && item.usersInfo && item.usersInfo.user_id
          );
          setUserPreferencesData(validData);
        } else {
          setUserPreferencesData([]);
        }
      } else {
        setUserPreferencesData([]);
      }
    } catch (e: any) {
      toast.push(
        React.createElement(
          Notification as any,
          { type: 'danger', title: 'Save failed' },
          e?.response?.data?.message || e?.message || `Failed to update column preferences for ${userName}.`
        )
      );
    }
  };

  // Loading state for fetching user preferences
  const [isFetchingPreferences, setIsFetchingPreferences] = useState(false);

  // Fetch user preferences when users are selected
  useEffect(() => {
    if (selectedUserIds.length === 0) {
      setUserPreferencesData([]);
      return;
    }

    let mounted = true;

    (async () => {
      setIsFetchingPreferences(true);
      try {
        const payload: GetMultipleUsersColumnPreferenceRequest = {
          table: effectiveTableKey,
          user_ids: selectedUserIds,
          role: selectedRole,
        };

        const res = await apiGetMultipleUsersColumnPreference(payload);

        if (!mounted) return;

        // Check success flag from backend
        if (res?.success === false) {
          console.warn('Failed to fetch user preferences:', res?.message);
          toast.push(
            React.createElement(
              Notification as any,
              { type: 'warning', title: 'Fetch warning' },
              res?.message || 'Could not load user preferences.'
            )
          );
          setUserPreferencesData([]);
          return;
        }

        if (res?.results && res.results.length > 0) {
          const tableResult = res.results.find((result) => result.table === effectiveTableKey);
          if (tableResult?.data && Array.isArray(tableResult.data)) {
            // Filter out any malformed data entries
            const validData = tableResult.data.filter(
              (item) => item && item.usersInfo && item.usersInfo.user_id
            );
            setUserPreferencesData(validData);
          } else {
            setUserPreferencesData([]);
          }
        } else {
          setUserPreferencesData([]);
        }
      } catch (e: any) {
        // Failed to fetch user preferences - show error
        console.warn('Error fetching user preferences:', e?.message);
        toast.push(
          React.createElement(
            Notification as any,
            { type: 'danger', title: 'Fetch failed' },
            e?.response?.data?.message || e?.message || 'Failed to load user preferences.'
          )
        );
        setUserPreferencesData([]);
      } finally {
        if (mounted) {
          setIsFetchingPreferences(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedUserIds, effectiveTableKey]);

  // pull server defaults for this table and apply to local state
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Fetch default (global) column preferences for this table
        const res = await apiGetColumnPreferenceByUser(effectiveTableKey, true);
        const serverData = res?.data ?? null;

        const serverOrder: string[] = Array.isArray(serverData?.columnOrders)
          ? serverData!.columnOrders
          : [];
        const serverVisibility: Record<string, boolean> =
          (serverData?.columnVisibility as any) || {};

        // only keep keys that exist in the rendered columns
        const allowedKeys = new Set(columnItems.map((c) => c.key));
        const filteredOrder = serverOrder.filter((k) => allowedKeys.has(k));

        if (!mounted) return;

        // apply order (fallback to current keys if server has none)
        if (filteredOrder.length) {
          setLocalOrder(filteredOrder);
        }

        // build visibility for the current columns using server flags (default true)
        const nextVis: Record<string, boolean> = {};
        columnItems.forEach((c) => {
          nextVis[c.key] = serverVisibility.hasOwnProperty(c.key)
            ? !!serverVisibility[c.key]
            : true;
        });
        setLocalVisibility(nextVis);
      } catch {
        // ignore – keep local fallbacks
      }
    })();

    return () => {
      mounted = false;
    };
  }, [effectiveTableKey, columnItems]);

  // State to toggle individual user views
  const [showIndividualViews, setShowIndividualViews] = useState(false);

  // Check if selected users have different settings
  // Only compare columns that exist in the current table's column list
  const userSettingsDiffer = useMemo(() => {
    if (userPreferencesData.length <= 1) return false;

    // Get the list of column keys for the current table
    const columnKeys = columnItems.map((c) => c.key);
    if (columnKeys.length === 0) return false;

    const firstUser = userPreferencesData[0];
    const firstVisibility = firstUser?.columnVisibility?.[effectiveTableKey] || {};

    for (let i = 1; i < userPreferencesData.length; i++) {
      const userVisibility = userPreferencesData[i]?.columnVisibility?.[effectiveTableKey] || {};

      // Only compare columns that exist in the current table definition
      // This prevents false positives from comparing arbitrary/stale keys
      for (const key of columnKeys) {
        // Default to true (visible) if not explicitly set
        const firstVal = firstVisibility[key] !== undefined ? firstVisibility[key] : true;
        const userVal = userVisibility[key] !== undefined ? userVisibility[key] : true;
        if (firstVal !== userVal) return true;
      }
    }
    return false;
  }, [userPreferencesData, effectiveTableKey, columnItems]);

  // Load selected user's preferences into the template when on Per-user tab
  // For multiple users: use UNION of hidden columns (column hidden by ANY user = hidden)
  useEffect(() => {
    if (activeTab !== 'perUser') return;
    if (userPreferencesData.length === 0) return;

    const allowedKeys = new Set(columnItems.map((c) => c.key));

    if (userPreferencesData.length === 1) {
      // Single user: load their settings directly
      const userData = userPreferencesData[0];
      const userOrder = userData?.columnOrders?.[effectiveTableKey] || [];
      const userVisibility = userData?.columnVisibility?.[effectiveTableKey] || {};

      const filteredOrder = userOrder.filter((k: string) => allowedKeys.has(k));

      if (filteredOrder.length > 0) {
        setLocalOrder(filteredOrder);
      } else {
        setLocalOrder(columnItems.map((c) => c.key));
      }

      const nextVis: Record<string, boolean> = {};
      columnItems.forEach((c) => {
        nextVis[c.key] = userVisibility.hasOwnProperty(c.key) ? !!userVisibility[c.key] : true;
      });
      setLocalVisibility(nextVis);
    } else {
      // Multiple users: UNION of hidden columns
      // A column is hidden if ANY user has it hidden
      const unionVisibility: Record<string, boolean> = {};

      columnItems.forEach((c) => {
        // Start with visible, mark hidden if ANY user has it hidden
        let isVisible = true;
        for (const userData of userPreferencesData) {
          const userVis = userData?.columnVisibility?.[effectiveTableKey] || {};
          if (userVis.hasOwnProperty(c.key) && userVis[c.key] === false) {
            isVisible = false;
            break;
          }
        }
        unionVisibility[c.key] = isVisible;
      });

      // Use first user's order or default
      const firstUserOrder = userPreferencesData[0]?.columnOrders?.[effectiveTableKey] || [];
      const filteredOrder = firstUserOrder.filter((k: string) => allowedKeys.has(k));

      if (filteredOrder.length > 0) {
        setLocalOrder(filteredOrder);
      } else {
        setLocalOrder(columnItems.map((c) => c.key));
      }

      setLocalVisibility(unionVisibility);
    }

    // Reset individual views toggle when users change
    setShowIndividualViews(false);
  }, [activeTab, userPreferencesData, effectiveTableKey, columnItems]);

  return (
    <div className="space-y-4 px-4">
      {/* Context bar */}
      <Card bodyClass="">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            {activeTab !== 'grouping' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Select a page</label>
                <Select
                  instanceId="admin-route-select"
                  placeholder="Select a page"
                  size="xs"
                  value={{
                    value: selectedRoute,
                    label:
                      filteredRoutes.find((t) => t.value === selectedRoute)?.label || selectedRoute,
                  }}
                  options={filteredRoutes}
                  onChange={(opt: any) => setSelectedRoute(opt?.value || 'dashboards/leads')}
                  className="w-40"
                />
              </div>
            )}

            {(() => {
              // Fix type error: 'child' does not exist on type, so use bracket notation and optional chaining
              const selectedRouteData = filteredRoutes.find((t) => t.value === selectedRoute);
              const childRoutes =
                selectedRouteData && 'child' in selectedRouteData
                  ? (selectedRouteData as any).child
                  : undefined;

              if (!childRoutes || childRoutes.length === 0) return null;

              return (
                <div className="">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Subtype</label>
                  <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                    {childRoutes.map((childRoute: any) => (
                      <Pill
                        key={childRoute.value}
                        active={selectedSubtype === childRoute.tblKey}
                        onClick={() => setSelectedSubtype(childRoute.tblKey as any)}
                      >
                        {childRoute.label}
                      </Pill>
                    ))}
                  </div>
                </div>
              );
            })()}
            {selectedRoute === 'dashboards/openings' && activeTab !== 'grouping' && (
              <div className="flex">
                {openingsStages.map((stage) => (
                  <Pill
                    key={stage.value}
                    active={selectedSubtype === stage.value}
                    onClick={() => setSelectedSubtype(stage.value)}
                  >
                    {stage.label}
                  </Pill>
                ))}
              </div>
            )}
            {selectedRoute === 'dashboards/tickets' && activeTab !== 'grouping' && (
              <div className="flex">
                {ticketTypes.map((type) => (
                  <Pill
                    key={type.value}
                    active={selectedSubtype === type.value}
                    onClick={() => setSelectedSubtype(type.value)}
                  >
                    {type.label}
                  </Pill>
                ))}
              </div>
            )}
            {activeTab === 'perUser' && (
              <div className="flex items-center gap-1 rounded-lg bg-gray-100">
                {/* <Pill
                  active={selectedRole === Role.ADMIN}
                  onClick={() => setSelectedRole(Role.ADMIN)}
                >
                  Admin
                </Pill> */}
                <Pill
                  active={selectedRole === Role.AGENT}
                  onClick={() => setSelectedRole(Role.AGENT)}
                >
                  Agent
                </Pill>
                {/* <Pill
                  active={selectedRole === Role.PROVIDER}
                  onClick={() => setSelectedRole(Role.PROVIDER)}
                >
                  Provider
                </Pill> */}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('perUser')}
                className={classNames(
                  'inline-flex items-center justify-center rounded-md px-4 py-1 text-sm font-medium transition-colors duration-200 ease-in-out',
                  activeTab === 'perUser'
                    ? 'text-primary border-primary/20 border bg-white shadow-sm'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                )}
              >
                Per-user
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('default')}
                className={classNames(
                  'inline-flex items-center justify-center rounded-md px-4 py-1 text-sm font-medium transition-colors duration-200 ease-in-out',
                  activeTab === 'default'
                    ? 'text-primary border-primary/20 border bg-white shadow-sm'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                )}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('grouping')}
                className={classNames(
                  'inline-flex items-center justify-center rounded-md px-4 py-1 text-sm font-medium transition-colors duration-200 ease-in-out',
                  activeTab === 'grouping'
                    ? 'text-primary border-primary/20 border bg-white shadow-sm'
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                )}
              >
                Grouping Settings
              </button>
            </div>

            {/* Action Button */}
            <div className="flex items-center">
              {activeTab === 'perUser' ? (
                <Button
                  variant="solid"
                  size="sm"
                  disabled={!hasChanges || isSavingPerUser || !selectedUserIds.length}
                  loading={isSavingPerUser}
                  onClick={handleSave}
                  icon={<ApolloIcon name="check" />}
                  aria-label="Save column preferences"
                  className="shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  {isSavingPerUser ? 'Saving...' : 'Save'}
                </Button>
              ) : activeTab === 'grouping' ? (
                <Button
                  variant="solid"
                  size="sm"
                  disabled={!groupingCanSave || groupingIsSaving}
                  loading={groupingIsSaving}
                  onClick={groupingHandleSave || undefined}
                  icon={<ApolloIcon name="check" />}
                  aria-label="Save grouping settings"
                  className="shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  Save Settings
                </Button>
              ) : (
                <Button
                  variant="solid"
                  size="sm"
                  disabled={!localOrder.length || isSavingDefault}
                  loading={isSavingDefault}
                  onClick={handleSaveDefault}
                  icon={<ApolloIcon name="check" />}
                  aria-label="Save default column preferences"
                  className="min-w-[120px] shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  {isSavingDefault ? 'Saving...' : 'Save Default'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Grouping Settings Tab */}
      {activeTab === 'grouping' ? (
        <TableSettingsManager
          onSaveStateChange={(canSave, handleSave, isSaving) => {
            setGroupingCanSave(canSave);
            setGroupingHandleSave(() => handleSave);
            setGroupingIsSaving(isSaving);
          }}
        />
      ) : (
        <>
          {/* Main grid */}
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Columns config */}
            <Card
              className={`transition-all duration-500 ease-in-out ${activeTab === 'default' ? 'w-full' : 'w-full lg:w-2/3'
                }`}
              bodyClass="p-3 md:p-4"
            >
              {/* <SectionHeader
                title="Columns"
                subtitle="Drag to reorder. Toggle visibility using the eye icon."
                right={<Badge content={localOrder.length} className="text-xs" />}
              /> */}

              <div>
                {columnItems.length ? (
                  <DraggableColumnList
                    columns={columnItems.map((c) => ({
                      ...c,
                      isVisible: localVisibility[c.key] ?? true,
                    }))}
                    onColumnVisibilityChange={(key, isVisible) =>
                      setLocalVisibility((prev) => ({ ...prev, [key]: isVisible }))
                    }
                    onClose={() => { }}
                    tableName={effectiveTableKey}
                    preservedFields={[]}
                    useStore={false}
                    order={localOrder}
                    onOrderChange={setLocalOrder}
                    onReset={() => {
                      const keys = columnItems.map((c) => c.key);
                      setLocalOrder(keys);
                      setLocalVisibility(
                        keys.reduce(
                          (acc, k) => ({ ...acc, [k]: true }),
                          {} as Record<string, boolean>
                        )
                      );
                    }}
                    contentView="table"
                  />
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
                    No columns detected for this view yet.
                  </div>
                )}
              </div>
            </Card>

            {/* Apply to users */}
            {activeTab === 'perUser' && (
              <Card
                className="w-full transition-all duration-500 ease-in-out lg:w-1/3"
                bodyClass="p-3 md:p-4"
              >
                <SectionHeader
                  title="Apply to Users"
                  subtitle="Choose who should receive these defaults."
                  right={<Badge content={selectedUserIds.length} />}
                />

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        instanceId="admin-users-multi-select"
                        placeholder={isAllUsersSelected ? 'All users selected' : 'Select users'}
                        isMulti={!isAllUsersSelected}
                        options={userOptions}
                        value={userOptions.filter((o: any) => selectedUserIds.includes(o.value))}
                        onChange={handleUserSelectionChange}
                        isLoading={isInitialLoading || isLoadingUsers}
                        onMenuScrollToBottom={loadMoreUsers}
                        noOptionsMessage={() =>
                          isLoadingUsers ? 'Loading more users...' : 'No users found'
                        }
                      />
                    </div>
                    {isAllUsersSelected && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleClearAllUsers}
                        icon={<ApolloIcon name="cross" className="text-sm" />}
                        aria-label="Clear all users selection"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {isAllUsersSelected
                      ? "All users will receive these column settings. Click 'Clear' to deselect and choose specific users."
                      : "This updates the selected users' table column order/visibility. Users can still change their personal view."}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Info message when users are selected - shows for both single and multiple users */}
          {activeTab === 'perUser' && selectedUserIds.length > 0 && (
            <Card
              bodyClass="p-4"
              className={
                userSettingsDiffer ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${userSettingsDiffer ? 'bg-amber-100' : 'bg-blue-100'
                      }`}
                  >
                    <span className="text-lg">
                      {userSettingsDiffer ? '⚠️' : selectedUserIds.length === 1 ? '👤' : '👥'}
                    </span>
                  </div>
                  <div>
                    <h4
                      className={`font-medium ${userSettingsDiffer ? 'text-amber-900' : 'text-blue-900'}`}
                    >
                      {isAllUsersSelected
                        ? 'All Users Selected'
                        : selectedUserIds.length === 1
                          ? `Selected: ${userPreferencesData[0]?.usersInfo?.name || 'User'}`
                          : `${selectedUserIds.length} Users Selected`}
                    </h4>
                    <p
                      className={`text-sm ${userSettingsDiffer ? 'text-amber-700' : 'text-blue-700'}`}
                    >
                      {userSettingsDiffer ? (
                        <>
                          Selected users have <strong>different column settings</strong>. The
                          template above shows the union of all hidden columns.
                        </>
                      ) : (
                        <>
                          Configure the columns above and click &quot;Save&quot; to apply settings
                          to{' '}
                          {isAllUsersSelected
                            ? 'all users'
                            : selectedUserIds.length === 1
                              ? 'this user'
                              : 'all selected users'}
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Button to toggle individual views */}
                {selectedUserIds.length > 1 && !isAllUsersSelected && (
                  <Button
                    size="sm"
                    variant={showIndividualViews ? 'solid' : 'plain'}
                    onClick={() => setShowIndividualViews(!showIndividualViews)}
                  >
                    {showIndividualViews ? 'Hide Individual Views' : 'View Individual Settings'}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Individual User Table Previews - shown when toggled */}
          {activeTab === 'perUser' &&
            showIndividualViews &&
            selectedUserIds.length > 1 &&
            !isAllUsersSelected && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Individual User Settings</h3>
                {userPreferencesData
                  .filter(
                    (userData) => userData && userData.usersInfo && userData.usersInfo.user_id
                  )
                  .map((userData, index) => {
                    return (
                      <UserTablePreview
                        key={userData.usersInfo.user_id || `user-${index}`}
                        userData={userData}
                        effectiveTableKey={effectiveTableKey}
                        defaultColumns={columnItems}
                        onSave={handleSaveUserPreferences}
                      />
                    );
                  })}
              </div>
            )}
        </>
      )}
    </div>
  );
};

// UserTablePreview Component
interface UserTablePreviewProps {
  userData: UserColumnPreferenceData;
  effectiveTableKey: string;
  defaultColumns: Array<{ key: string; label: string; isVisible: boolean }>;
  onSave: (
    userId: string,
    userName: string,
    columnOrder: string[],
    columnVisibility: Record<string, boolean>
  ) => Promise<void>;
}

const UserTablePreview: React.FC<UserTablePreviewProps> = ({
  userData,
  effectiveTableKey,
  defaultColumns,
  onSave,
}) => {
  // Get user's saved preferences or fall back to defaults
  const userOrder = useMemo(() => {
    const saved = userData?.columnOrders?.[effectiveTableKey];
    if (saved && saved.length > 0) return saved;
    // Fall back to default column order
    return defaultColumns.map((c) => c.key);
  }, [userData?.columnOrders, effectiveTableKey, defaultColumns]);

  const userVisibility = useMemo(() => {
    const saved = userData?.columnVisibility?.[effectiveTableKey];
    if (saved && Object.keys(saved).length > 0) return saved;
    // Fall back to default visibility (all visible)
    const defaults: Record<string, boolean> = {};
    defaultColumns.forEach((c) => {
      defaults[c.key] = c.isVisible;
    });
    return defaults;
  }, [userData?.columnVisibility, effectiveTableKey, defaultColumns]);

  // Local state for drag and drop
  const [localOrder, setLocalOrder] = useState<string[]>(userOrder);
  const [localVisibility, setLocalVisibility] = useState<Record<string, boolean>>(userVisibility);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when userData changes
  useEffect(() => {
    setLocalOrder(userOrder);
    setLocalVisibility(userVisibility);
  }, [userOrder, userVisibility]);

  // Create ordered columns based on local state
  const orderedUserColumns = localOrder.map((key) => ({
    key,
    label: LABELS[key] || key,
    isVisible: localVisibility[key] !== false, // default to true if not specified
  }));

  const visibleColumnsCount = orderedUserColumns.filter((col) => col.isVisible).length;

  // Check if there are changes
  const hasChanges = useMemo(() => {
    const orderChanged = JSON.stringify(localOrder) !== JSON.stringify(userOrder);
    const visibilityChanged = JSON.stringify(localVisibility) !== JSON.stringify(userVisibility);
    return orderChanged || visibilityChanged;
  }, [localOrder, userOrder, localVisibility, userVisibility]);

  // Early return if userData is undefined or malformed (after all hooks)
  if (!userData || !userData.usersInfo || !userData.usersInfo.user_id) {
    return null;
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(orderedUserColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const newOrder = items.map((item) => item.key);
    setLocalOrder(newOrder);
  };

  const handleVisibilityChange = (key: string, isVisible: boolean) => {
    setLocalVisibility((prev) => ({ ...prev, [key]: isVisible }));
  };

  const handleSave = async () => {
    if (!userData?.usersInfo?.user_id || !userData?.usersInfo?.name) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        userData.usersInfo.user_id,
        userData.usersInfo.name,
        localOrder,
        localVisibility
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalOrder(userOrder);
    setLocalVisibility(userVisibility);
  };

  return (
    <Card bodyClass="p-3 md:p-4">
      <SectionHeader
        title={`${userData?.usersInfo?.name || 'Unknown User'} - ${effectiveTableKey.charAt(0).toUpperCase() + effectiveTableKey.slice(1)} Table`}
        subtitle={`Configure ${userData?.usersInfo?.name || 'Unknown User'}'s column settings`}
        right={
          <div className="flex items-center gap-2">
            <Badge content={`${visibleColumnsCount}/${orderedUserColumns.length} visible`} />
            {hasChanges && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReset}
                icon={<ApolloIcon name="repeat" className="text-sm" />}
              >
                Reset
              </Button>
            )}
            <Button
              variant="solid"
              size="sm"
              loading={isSaving}
              disabled={!hasChanges}
              onClick={handleSave}
              icon={<ApolloIcon name="check" className="text-sm" />}
            >
              Save
            </Button>
          </div>
        }
      />

      <div className="mt-3 text-xs text-gray-600">
        Drag columns to reorder them. Toggle visibility using eye icons.
      </div>

      <div className="mt-3">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="min-w-full rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Table Header */}
            <Droppable
              droppableId={`user-columns-${userData?.usersInfo?.user_id || 'unknown'}`}
              direction="horizontal"
            >
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`flex overflow-x-auto border-b border-gray-200 bg-gray-50 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''
                    }`}
                >
                  {orderedUserColumns.map((column, index) => (
                    <Draggable
                      key={column.key}
                      draggableId={`${userData?.usersInfo?.user_id || 'unknown'}-${column.key}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex w-[200px] flex-col border-r border-gray-200 transition-all last:border-r-0 ${snapshot.isDragging
                            ? 'z-50 scale-105 rotate-1 rounded-lg border-2 border-blue-300 bg-blue-100 shadow-2xl'
                            : 'bg-gray-50'
                            } ${!column.isVisible ? 'opacity-40' : ''}`}
                          style={provided.draggableProps.style}
                        >
                          {/* Header controls */}
                          <div className="flex items-center justify-between gap-2 p-2">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab text-gray-400 hover:cursor-grabbing hover:text-gray-600"
                            >
                              <ApolloIcon name="drag-and-sort" className="text-sm" />
                            </div>
                            <div className="flex-1 text-center">
                              <span className="truncate text-xs font-medium text-gray-600">
                                {column.label}
                              </span>
                            </div>
                            <button
                              onClick={() => handleVisibilityChange(column.key, !column.isVisible)}
                              className="p-1 text-gray-400 transition-colors hover:text-gray-600"
                              title={column.isVisible ? 'Hide column' : 'Show column'}
                            >
                              <ApolloIcon
                                name={column.isVisible ? 'eye-filled' : 'eye-slash'}
                                className="text-sm"
                              />
                            </button>
                          </div>

                          {/* Column header */}
                          <div
                            className={`border-t border-gray-200 px-3 py-2 ${snapshot.isDragging
                              ? 'bg-blue-50'
                              : column.isVisible
                                ? 'bg-white'
                                : 'bg-gray-100'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`truncate text-xs font-semibold tracking-wider uppercase ${column.isVisible ? 'text-gray-700' : 'text-gray-400'
                                  }`}
                              >
                                Content
                              </span>
                              {!column.isVisible && (
                                <span className="ml-1 text-xs text-red-500" title="Hidden column">
                                  ✕
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Table Body - Sample Data Rows */}
            {/* <div className="divide-y divide-gray-200">
              {[1, 2].map((rowIndex) => (
                <div key={rowIndex} className="flex">
                  {orderedUserColumns.map((column) => (
                    <div
                      key={column.key}
                      className={`w-[200px] border-r border-gray-200 px-3 py-2 last:border-r-0 ${
                        !column.isVisible ? 'bg-gray-50 opacity-40' : ''
                      }`}
                    >
                      <span
                        className={`truncate text-sm ${
                          column.isVisible ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {column.isVisible ? 'Static' : 'Hidden'}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div> */}
          </div>
        </DragDropContext>
      </div>
    </Card>
  );
};

export default AdminTableSettingsDashboard;
