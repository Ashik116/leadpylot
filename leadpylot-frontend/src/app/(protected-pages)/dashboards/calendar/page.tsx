'use client';
import { LeadsDashboardProvider } from '../leads/context/LeadsDashboardContext';
import ScheduledLeadsCalendarView from './_components/ScheduledLeadsCalendarView';
import LeadsDashboardProps from '@/_interface/commonLeadsDashboardInterface';

const scheduledLeadsProps: LeadsDashboardProps = {
  pageTitle: 'Scheduled Leads',
  tableName: 'scheduled_leads',
  pageInfoSubtitlePrefix: 'Scheduled Leads',
  sharedDataTable: false,
  pendingLeadsComponent: false,
  deleteButton: false,
  hideGroupBy: true, // Hide grouping for calendar view
};

export default function ScheduledLeadsPage() {
  return (
    <LeadsDashboardProvider {...scheduledLeadsProps}>
      <ScheduledLeadsCalendarView />
    </LeadsDashboardProvider>
  );
}
