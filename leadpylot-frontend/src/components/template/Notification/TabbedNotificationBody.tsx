'use client';

import ScrollBar from '@/components/ui/ScrollBar';
import Tabs from '@/components/ui/Tabs';
import classNames from 'classnames';
import { useCallback, useMemo, useState } from 'react';
// import NotificationIcon from './NotificationIcon';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  HiOutlineBell,
  HiOutlineLogin,
  HiOutlineMail,
  HiOutlineOfficeBuilding,
  HiOutlineUsers,
} from 'react-icons/hi';
import NotificationOffer from './_components/NotificationOffer';
import NotificationLeads from './_components/NotificationLeads';

type NotificationList = {
  id: string;
  target: string;
  description: string;
  date: string;
  timestamp?: string;
  image: string;
  type: number;
  location: string;
  locationLabel: string;
  status: string;
  readed: boolean;
  offerId?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  isRealtime?: boolean;
  notificationType?: string;
  leadId?: string;
  projectId?: string;
  metadata?: any;
};

type TabbedNotificationBodyProps = {
  notificationList: NotificationList[];
  notificationHeight: string;
  loading: boolean;
  noResult: boolean;
  handleNotificationClick: (item: NotificationList) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onMarkCategoryAsRead?: (category: 'email' | 'login' | 'offer' | 'leads' | 'others') => void;
  isLastChild: (notificationList: NotificationList[], index: number) => boolean;
  userRole?: string; // Add userRole to determine tab visibility
};
export const setNotificationTypeBg = ({ type }: { type: string }) => {
  const category = formatNotificationType(type || '');
  switch (category) {
    case 'Offer':
      return 'bg-angebot text-white';
    case 'Opening':
      return 'bg-btn-opening text-gray-700';
    case 'Confirmation':
      return 'bg-btn-confirmation text-gray-800';
    case 'Payment':
      return 'bg-btn-payment text-gray-700';
    case 'Netto1':
      return 'bg-btn-netto1 text-gray-700';
    case 'Netto2':
      return 'bg-btn-netto2 text-gray-700';
    default:
      return 'bg-gray-100 text-blue-800';
  }
};
// Helper function to format notification type display
export const formatNotificationType = (type: string) => {
  const typeMap = {
    offer_created: 'Offer',
    offer_created_admin: 'Offer',
    opening_created: 'Opening',
    opening_created_admin: 'Opening',
    confirmation_created: 'Confirmation',
    payment_voucher_created: 'Payment',
    netto1_created: 'Netto1',
    netto2_created: 'Netto2',
    meeting_created: 'Meeting',
    project_created: 'Project',
    project_updated: 'Project Update',
    project_closed: 'Project Closed',
    lead_assigned: 'Lead Assignment',
    lead_assignment_admin: 'Lead Assignment',
    reclamation_created: 'Reclamation',
    transaction_created: 'Transaction',
    payment_processed: 'Payment',
  };
  return typeMap[type as keyof typeof typeMap] || type;
};
export const isBusinessNotification = (notificationType: string) => {
  const businessTypes = [
    'offer_created',
    'opening_created',
    'confirmation_created',
    'payment_voucher_created',
    'netto1_created',
    'netto2_created',
    'opening_created_admin',
    'offer_created_admin', // Admin-generated notifications to agents
  ];
  return businessTypes.includes(notificationType);
};
export const extractBusinessDetails = (notification: NotificationList) => {
  try {
    const metadata = notification?.metadata;
    const description = notification?.description;

    // Try to extract details from metadata first, then description
    let leadName = '';
    let amount = '';
    let interestRate = '';
    let bonus = '';
    let bank = '';

    // Check if we have structured data from metadata (prioritize this over regex extraction)
    if (metadata) {
      leadName = metadata?.leadName || metadata?.lead_name || '';
      amount = metadata?.amount || metadata?.investmentVolume || metadata?.investment_volume || '';
      interestRate = metadata?.interestRate || metadata?.interest_rate || '';
      bonus = metadata?.bonus || metadata?.bonusAmount || metadata?.bonus_amount || '';
      bank = metadata?.bank || metadata?.bankName || metadata?.bank_name || '';
    }

    // Debug logging to see what we're getting (remove this after testing)
    // console.log('DEBUG Frontend: extractBusinessDetails', {
    //   notificationId: notification.id,
    //   notificationType: notification.notificationType,
    //   hasMetadata: !!metadata,
    //   metadataKeys: metadata ? Object.keys(metadata) : [],
    //   metadata: metadata,
    //   extractedData: { leadName, amount, interestRate, bonus, bank }
    // });

    // If no structured data, try to extract from description
    if (!leadName) {
      const leadMatch = description.match(
        /lead\s+"([^"]+)"|for\s+lead\s+"([^"]+)"|lead\s+([A-Za-z\s]+)\s*-/i
      );
      if (leadMatch) {
        leadName = leadMatch[1] || leadMatch[2] || leadMatch[3] || '';
      }
    }

    if (!amount) {
      const amountMatch = description.match(
        /€\s?([\d,]+(?:\.\d{2})?)|(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*€/
      );
      if (amountMatch) {
        amount = amountMatch[1] || amountMatch[2] || '';
      }
    }

    if (!interestRate) {
      const rateMatch = description.match(/(\d+(?:\.\d+)?%)\s*interest|at\s+(\d+(?:\.\d+)?%)/i);
      if (rateMatch) {
        interestRate = rateMatch[1] || rateMatch[2] || '';
      }
    }

    if (!bank) {
      const bankMatch = description.match(/bank[:\s]+([A-Za-z\s]+)/i);
      if (bankMatch) {
        bank = bankMatch[1].trim();
      }
    }

    // Clean up extracted data - ensure they are strings
    leadName = (leadName || '').toString().trim();
    amount = (amount || '').toString();
    interestRate = (interestRate || '').toString();
    bonus = (bonus || '').toString();
    bank = (bank || '').toString();

    // Remove commas from numeric strings
    amount = amount.replace(/,/g, '');
    bonus = bonus.replace(/,/g, '');

    return {
      leadName: leadName || 'Unknown Lead',
      amount:
        amount && amount !== 'N/A'
          ? amount.includes('€')
            ? amount
            : isNaN(Number(amount))
              ? amount
              : `€${Number(amount).toLocaleString()}`
          : 'N/A',
      interestRate:
        interestRate && interestRate !== 'N/A'
          ? interestRate.includes('%')
            ? interestRate
            : `${interestRate}%`
          : 'N/A',
      bonus:
        bonus && bonus !== 'N/A'
          ? bonus.includes('€')
            ? bonus
            : isNaN(Number(bonus))
              ? bonus
              : `€${Number(bonus).toLocaleString()}`
          : 'N/A',
      bank: bank && bank !== 'N/A' ? bank : 'N/A',
    };
  } catch (error) {
    // If there's any error in data extraction, return safe defaults
    // eslint-disable-next-line no-console
    console.error('Error extracting business details:', error, notification);
    return {
      leadName: 'Unknown Lead',
      amount: 'N/A',
      interestRate: 'N/A',
      bonus: 'N/A',
      bank: 'N/A',
    };
  }
};
const TabbedNotificationBody = ({
  notificationList,
  notificationHeight,
  loading,
  handleNotificationClick,
  onMarkAsRead,
  onMarkCategoryAsRead,
  userRole = 'Admin', // Default to Admin if not provided
}: TabbedNotificationBodyProps) => {
  const [activeTab, setActiveTab] = useState('offer'); // Default to offers tab

  // Helper function to sort notifications by date (newest first) and limit to 20
  const sortAndLimit = (notifications: NotificationList[]) => {
    return [...notifications]
      ?.sort((a, b) => {
        // Sort by date/timestamp descending (newest first)
        const dateA = new Date(a?.timestamp || a?.date || 0).getTime();
        const dateB = new Date(b?.timestamp || b?.date || 0).getTime();
        return dateB - dateA;
      })
      ?.slice(0, 20); // Limit to 20 latest
  };

  // Categorize notifications and limit to 20 latest per category
  const categorizedNotifications = useMemo(() => {
    const email = sortAndLimit(
      notificationList?.filter(
        (item) =>
          item.notificationType === 'email' ||
          item.notificationType === 'email_system_received' ||
          item.notificationType === 'email_received' ||
          item.notificationType === 'email_approved' ||
          item.notificationType === 'email_agent_assigned'
      )
    );

    const login = sortAndLimit(
      notificationList?.filter(
        (item) =>
          item?.notificationType === 'agent_login' || item?.notificationType === 'agent_logout'
      )
    );

    const offer = sortAndLimit(
      notificationList?.filter(
        (item) =>
          item?.notificationType === 'offer_created' ||
          item?.notificationType === 'opening_created' ||
          item?.notificationType === 'confirmation_created' ||
          item?.notificationType === 'payment_voucher_created' ||
          item?.notificationType === 'netto1_created' ||
          item?.notificationType === 'netto2_created'
      )
    );

    // New "Leads" category for lead-related notifications (includes todo/kanban)
    const leads = sortAndLimit(
      notificationList?.filter(
        (item) =>
          item?.notificationType === 'lead_assigned' ||
          item?.notificationType === 'lead_assignment_admin' ||
          item?.notificationType === 'lead_status_changed' ||
          item?.notificationType === 'lead_converted' ||
          item.notificationType === 'todo_created' ||
          item.notificationType === 'todo_assigned' ||
          item.notificationType === 'todo_agent_assignment' ||
          item.notificationType === 'todo_completed' ||
          item.notificationType === 'todo_completed_admin' ||
          item.notificationType === 'todo_updated'
      )
    );

    // "Others" category for remaining notifications
    const others = sortAndLimit(
      notificationList?.filter(
        (item) =>
          item.notificationType === 'project_created' ||
          item.notificationType === 'project_assigned' ||
          item.notificationType === 'commission_earned' ||
          item.notificationType === 'revenue_target_met' ||
          item.notificationType === 'system_maintenance' ||
          item.notificationType === 'user_role_changed' ||
          item.notificationType === 'email_comment_mention' ||
          item.notificationType === 'email_comment_added' ||
          item.notificationType === 'appointment_created' ||
          item.notificationType === 'appointment_updated' ||
          item.notificationType === 'appointment_deleted'
      )
    );

    return { email, login, offer, leads, others };
  }, [notificationList]);

  // Calculate unread counts for each category
  const unreadCounts = useMemo(() => {
    return {
      email: categorizedNotifications?.email?.filter((item) => !item?.readed).length,
      login: categorizedNotifications?.login?.filter((item) => !item?.readed).length,
      offer: categorizedNotifications?.offer?.filter((item) => !item?.readed).length,
      leads: categorizedNotifications?.leads?.filter((item) => !item?.readed).length,
      others: categorizedNotifications?.others?.filter((item) => !item?.readed).length,
    };
  }, [categorizedNotifications]);

  // Mark all as read for current tab
  const handleMarkTabAsRead = useCallback(() => {
    if (onMarkCategoryAsRead) {
      // Use the efficient category-based marking if available
      onMarkCategoryAsRead(activeTab as 'email' | 'login' | 'offer' | 'leads' | 'others');
    } else {
      // Fallback to individual marking
      const currentNotifications =
        categorizedNotifications[activeTab as keyof typeof categorizedNotifications];
      const unreadIds =
        currentNotifications?.filter((item) => !item?.readed)?.map((item) => item?.id) || [];

      if (unreadIds?.length === 0) return;

      // Mark each unread notification in current tab as read
      unreadIds?.forEach((id) => onMarkAsRead(id));
    }
  }, [activeTab, categorizedNotifications, onMarkAsRead, onMarkCategoryAsRead]);

  // Get current tab unread count
  const currentUnreadCount = unreadCounts[activeTab as keyof typeof unreadCounts];

  // Helper function to check if notification is business-related (only for Offers tab now)

  // Helper function to extract business details from notification

  // Simple notification renderer for Others tab (always uses basic design)
  const renderSimpleNotificationList = (notifications: NotificationList[]) => {
    return (
      <ScrollBar autoHide={true} className={classNames('overflow-hidden', notificationHeight)}>
        {notifications.length > 0 ? (
          <>
            {/* Tab Actions Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
              <span className="text-sm font-medium text-gray-700">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
              {/* {currentUnreadCount > 0 && (
                <Button
                  size="xs"
                  variant="solid"
                  color="blue"
                  onClick={handleMarkTabAsRead}
                  className="text-xxs"
                >
                  Mark all as read ({currentUnreadCount})
                </Button>
              )} */}
            </div>

            <div
              className={classNames('w-full overflow-x-hidden overflow-y-auto', notificationHeight)}
            >
              <div className="w-full divide-y divide-gray-100">
                {notifications.map((item) => (
                  <div key={item.id}>
                    <NotificationLeads
                      item={item}
                      handleNotificationClick={handleNotificationClick}
                      viewDetails
                    />{' '}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-gray-500">
            <p className="text-sm">No notifications</p>
          </div>
        )}
      </ScrollBar>
    );
  };

  const renderNotificationList = (notifications: NotificationList[]) => (
    <div className="flex w-full flex-col">
      {notifications?.length > 0 ? (
        <>
          {/* Tab Actions Header */}
          <div className="flex w-full shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
            <span className="truncate text-sm text-gray-600">
              {notifications?.length} notification{notifications?.length !== 1 ? 's' : ''}
              {currentUnreadCount > 0 && (
                <span className="text-xxs ml-2 rounded-full bg-red-100 px-2 py-1 text-red-600">
                  {currentUnreadCount} unread
                </span>
              )}
            </span>
            {currentUnreadCount > 0 && (
              <Button
                variant="plain"
                size="xs"
                className="shrink-0 text-blue-600 hover:text-blue-700"
                onClick={handleMarkTabAsRead}
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div
            className={classNames('w-full overflow-x-hidden overflow-y-auto', notificationHeight)}
          >
            <div className="w-full divide-y divide-gray-100">
              {notifications?.map((item) => (
                <div key={item?.id} className="w-full">
                  <NotificationOffer
                    handleNotificationClick={handleNotificationClick}
                    item={item}
                    userRole={userRole}
                    viewDetails
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-[200px] w-full items-center justify-center">
          <div className="px-4 text-center">
            <div className="mx-auto mb-4 h-16 w-16 text-gray-300">
              {activeTab === 'email' && <HiOutlineMail className="h-full w-full" />}
              {activeTab === 'login' && <HiOutlineLogin className="h-full w-full" />}
              {activeTab === 'offer' && <HiOutlineOfficeBuilding className="h-full w-full" />}
              {activeTab === 'leads' && <HiOutlineUsers className="h-full w-full" />}
            </div>
            <h6 className="mb-1 font-semibold text-gray-900">No {activeTab} notifications</h6>
            <p className="text-sm text-gray-500">You&apos;re all caught up!</p>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={classNames('flex items-center justify-center', notificationHeight)}>
        <Spinner size={40} />
      </div>
    );
  }
  return (
    <div className="w-full">
      <Tabs value={activeTab} onChange={(val) => setActiveTab(val as string)}>
        <Tabs.TabList className="flex overflow-hidden border-b border-gray-200 bg-gray-50 px-1">
          {/* Offers Tab - First */}
          <Tabs.TabNav value="offer" className="flex-1">
            <div className="flex items-center justify-center gap-0.5 py-2">
              <HiOutlineOfficeBuilding className="text-sm" />
              <span className="text-sm font-medium">Offers</span>
              {unreadCounts?.offer > 0 && (
                <span className="text-xxs flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 py-0.5 text-white">
                  {unreadCounts?.offer}
                </span>
              )}
            </div>
          </Tabs.TabNav>

          {/* Leads Tab - Second */}
          <Tabs.TabNav value="leads" className="flex-1">
            <div className="flex items-center justify-center gap-0.5 py-2">
              <HiOutlineUsers className="text-sm" />
              <span className="text-sm font-medium">Leads</span>
              {unreadCounts?.leads > 0 && (
                <span className="text-xxs flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 py-0.5 text-white">
                  {unreadCounts?.leads}
                </span>
              )}
            </div>
          </Tabs.TabNav>

          {/* Email Tab - Third */}
          <Tabs.TabNav value="email" className="flex-1">
            <div className="flex items-center justify-center gap-0.5 py-2">
              <HiOutlineMail className="text-lg" />
              <span className="text-sm font-medium">Email</span>
              {unreadCounts?.email > 0 && (
                <span className="text-xxs flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 py-0.5 text-white">
                  {unreadCounts?.email}
                </span>
              )}
            </div>
          </Tabs.TabNav>

          {/* Login Tab - Fourth (Hidden for Agents) */}
          {userRole === 'Admin' && (
            <Tabs.TabNav value="login" className="flex-1">
              <div className="flex items-center justify-center gap-0.5 py-2">
                <HiOutlineLogin className="text-lg" />
                <span className="text-sm font-medium">Login</span>
                {unreadCounts?.login > 0 && (
                  <span className="text-xxs flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 py-0.5 text-white">
                    {unreadCounts?.login}
                  </span>
                )}
              </div>
            </Tabs.TabNav>
          )}

          {/* Others Tab - Fifth (Only for Agents) */}

          <Tabs.TabNav value="others" className="flex-1">
            <div className="flex items-center justify-center gap-0.5 py-2">
              <HiOutlineBell className="text-lg" />
              <span className="text-sm font-medium">Others</span>
              {unreadCounts?.others > 0 && (
                <span className="text-xxs flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-white">
                  {unreadCounts?.others}
                </span>
              )}
            </div>
          </Tabs.TabNav>
        </Tabs.TabList>

        {/* Offers Tab Content - First */}
        <Tabs.TabContent value="offer">
          {renderNotificationList(categorizedNotifications?.offer)}
        </Tabs.TabContent>

        {/* Leads Tab Content - Second */}
        <Tabs.TabContent value="leads">
          {renderSimpleNotificationList(categorizedNotifications?.leads)}
        </Tabs.TabContent>

        {/* Email Tab Content - Third */}
        <Tabs.TabContent value="email">
          {renderNotificationList(categorizedNotifications?.email)}
        </Tabs.TabContent>

        {/* Login Tab Content - Fourth (Hidden for Agents) */}
        {userRole === 'Admin' && (
          <Tabs.TabContent value="login">
            {renderNotificationList(categorizedNotifications?.login)}
          </Tabs.TabContent>
        )}

        {/* Others Tab Content - Fifth (Only for Agents) */}

        <Tabs.TabContent value="others">
          {renderSimpleNotificationList(categorizedNotifications?.others)}
        </Tabs.TabContent>
      </Tabs>
    </div>
  );
};

export default TabbedNotificationBody;
