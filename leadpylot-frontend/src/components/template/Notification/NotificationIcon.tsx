import { EventList } from './event.list';
import Avatar from '@/components/ui/Avatar';
import ApolloIcon from '@/components/ui/ApolloIcon';

const userRoles = [
  {
    event: EventList.LeadAssigned,
    imageUrl: <ApolloIcon name="users" />,
    color: 'bg-ocean-2 text-ocean-4',
  },
  {
    event: EventList.LeadAssignmentAdmin,
    imageUrl: <ApolloIcon name="users" />,
    color: 'bg-ocean-2 text-ocean-4',
  },
  {
    event: EventList.AgentLogin,
    imageUrl: <ApolloIcon name="padlock" />,
    color: 'bg-sky-200 text-gray-900',
  },
  {
    event: EventList.AgentLogout,
    imageUrl: <ApolloIcon name="padlock" />,
    color: 'bg-sky-200 text-gray-900',
  },
  {
    event: EventList.ProjectCreated,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.ProjectAssigned,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.LeadStatusChanged,
    imageUrl: <ApolloIcon name="users" />,
    color: 'bg-ocean-2 text-ocean-4',
  },
  {
    event: EventList.LeadConverted,
    imageUrl: <ApolloIcon name="users" />,
    color: 'bg-ocean-2 text-ocean-4',
  },
  {
    event: EventList.OfferCreated,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.OpeningCreated,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.ProviderApproved,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.ProviderRejected,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.ProviderPayment,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.CommissionEarned,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.RevenueTargetMet,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.SystemMaintenance,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
  {
    event: EventList.UserRoleChanged,
    imageUrl: <ApolloIcon name="layer-group" />,
    color: 'bg-iris-3 text-gray-900',
  },
];

const defaultIcon = { imageUrl: <ApolloIcon name="bell" />, color: 'bg-sky-200 text-gray-900' };

const NotificationIcon = (data: any) => {
  const findIcon = userRoles.find((r) => r.event === data.notificationType) ?? defaultIcon;
  return (
    <Avatar shape="circle" className={findIcon.color}>
      {findIcon.imageUrl}
    </Avatar>
  );
};

export default NotificationIcon;
