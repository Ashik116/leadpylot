import dayjs from 'dayjs';
import { Lead } from '@/services/LeadsService';

export interface CalendarEventType {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  extendedProps: {
    eventColor: string;
    leadId?: string;
    leadName?: string;
    leadEmail?: string;
    leadPhone?: string;
    description?: string;
    recurring?: boolean;
  };
}

/**
 * Generate sample events for a lead
 */
export function generateSampleEvents(lead: Lead): CalendarEventType[] {
  // Return empty array if lead is not provided
  if (!lead) return [];

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return [
    {
      id: '1',
      title: `Meeting with ${lead.contact_name || 'Client'}`,
      start: tomorrow,
      end: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 hour meeting
      extendedProps: {
        eventColor: 'red',
        leadId: typeof lead._id === 'number' ? String(lead._id) : lead._id,
        leadName: lead.contact_name,
        leadEmail: lead.email_from,
        leadPhone: lead.phone,
      },
    },
  ];
}

/**
 * Format calendar view title based on the current view
 */
export function formatCalendarViewTitle(view: string): string {
  if (!view) {
    return '';
  }

  const now = dayjs();

  // Format the date range based on the current view
  if (view === 'dayGridMonth') {
    return now.format('MMMM YYYY');
  } else if (view === 'timeGridWeek') {
    const weekStart = now.startOf('week');
    const weekEnd = now.endOf('week');
    return `${weekStart.format('MMM D')} – ${weekEnd.format('MMM D')}, ${weekEnd.format('YYYY')}`;
  } else {
    return now.format('MMMM D, YYYY');
  }
}
