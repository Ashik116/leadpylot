import AcceptedOffersMenuIcon from '@/assets/svg/menu-icons/AcceptedOffersMenuIcon';
import CallsMenuIcon from '@/assets/svg/menu-icons/CallsMenuIcon';
import LeadsMenuIcon from '@/assets/svg/menu-icons/LeadsMenuIcon';
import MailsMenuIcon from '@/assets/svg/menu-icons/MailsMenuIcon';
import OffersMenuIcon from '@/assets/svg/menu-icons/OffersMenuIcon';
import OpeningMenuIcon from '@/assets/svg/menu-icons/OpeningMenuIcon';
import PaymentVouchersMenuIcon from '@/assets/svg/menu-icons/PaymentVouchersMenuIcon';
import ProjectsMenuIcon from '@/assets/svg/menu-icons/ProjectsMenuIcon';
import ReclamationsMenuIcon from '@/assets/svg/menu-icons/ReclamationsMenuIcon';
import SettingsMenuIcon from '@/assets/svg/menu-icons/SettingsMenuIcon';
import UsersMenuIcon from '@/assets/svg/menu-icons/UsersMenuIcon';
import ApolloIcon from '@/components/ui/ApolloIcon';
import type { JSX } from 'react';

export type NavigationIcons = Record<string, JSX.Element>;

const navigationIcon: NavigationIcons = {
  dashboardHome: <ApolloIcon name="home" />,
  dashboardMails: <MailsMenuIcon />,
  dashboardCalls: <CallsMenuIcon />,
  dashboardLeads: <LeadsMenuIcon />,
  dashboardUsers: <UsersMenuIcon />,
  dashboardProjects: <ProjectsMenuIcon />,
  dashboardReclamations: <ReclamationsMenuIcon />,
  dashboardOpening: <OpeningMenuIcon />,
  dashboardOffers: <OffersMenuIcon />,
  dashboardAcceptedOffers: <AcceptedOffersMenuIcon />,
  outOffersIcon: <ApolloIcon name="log-out" />,

  dashboardPaymentVouchers: <PaymentVouchersMenuIcon />,
  accountSettings: <SettingsMenuIcon />,
  dashboardImportLeads: <ApolloIcon name="cloud-download" />,
  dashboardRecentImport: <ApolloIcon name="clock-eight" />,
  todoIcon: <ApolloIcon name="persistent-checklist" />,
  liveLeadsIcon: <ApolloIcon name="check-circle-task" className="text-rust" />,
  scheduledLeadsIcon: <ApolloIcon name="calendar" className="text-rust" />,
  recycleLeadsIcon: <ApolloIcon name="enrichment-refresh" className="text-evergreen" />,
  dashboardDocuments: <ApolloIcon name="file" />,
  dashboardCashflow: <ApolloIcon name="wallet" />,
  ChartBarIcon: <ApolloIcon name="area-chart" />,
  holdsIcon: <ApolloIcon name="archive-box" />,
  dashboardCommunications: <ApolloIcon name="comment" />,
  dashboardHousekeeping: <ApolloIcon name="cog" />,
  // Leads submenu icons
  leadsBankIcon: <ApolloIcon name="briefcase" />,
  allLeadsIcon: <ApolloIcon name="users" />,
  pendingLeadsIcon: <ApolloIcon name="clock-eight" />,
  archivedLeadsIcon: <ApolloIcon name="archive-box" />,
  activeLeadsIcon: <ApolloIcon name="check-circle-task" className="text-evergreen" />,
  useableLeadsIcon: <ApolloIcon name="enrichment-refresh" className="text-blue-500" />,
  // Agent leads icons
  agentLiveLeadsIcon: <ApolloIcon name="check-circle-task" className="text-rust" />,
  agentRecycleLeadsIcon: <ApolloIcon name="enrichment-refresh" className="text-evergreen" />,
  usersPermissionsIcon: <ApolloIcon name="list-deselect" />,
  officesIcon: <ApolloIcon name="home" />,
  mail: <ApolloIcon name="mail" />,
  phone: <ApolloIcon name="phone" />,
  bank: <ApolloIcon name="briefcase" />,
  calendar: <ApolloIcon name="calendar" className="text-blue-600" />,
  payment: <ApolloIcon name="money-bag" />,
  wallet: <ApolloIcon name="wallet" />,
  // Stages - using layer-group to represent workflow stages
  'layer-group': <ApolloIcon name="layer-group" />,
  'apollo-ai': <ApolloIcon name="apollo-ai" />,
  // Sources - using tag to represent lead sources
  tag: <ApolloIcon name="tag" />,
  // Email Templates - using file-alt to represent template files
  'file-alt': <ApolloIcon name="file-alt" />,
  // PDF Templates - using file to represent PDF files
  file: <ApolloIcon name="file" />,
  security: <ApolloIcon name="shield" />,
  notification: <ApolloIcon name="bell" />,
  // Table Settings - using sliders-settings for table configuration
  'sliders-settings': <ApolloIcon name="sliders-settings" />,
  // Tenants - using company to represent organizations
  company: <ApolloIcon name="company" />,
  dashboardMeetings: <ApolloIcon name="meeting-source" />,
};

export default navigationIcon;
