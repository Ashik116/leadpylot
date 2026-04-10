'use client';

import { useEffect } from 'react';
import { useCalendarStore } from '../_store/calendarStore';
import { useMeetings } from '@/services/hooks/meetings/useMeetings';
import { formatCalendarViewTitle } from './eventUtils';
import { CalendarEventType } from '../types';
import { TLead } from '@/services/LeadsService';

interface CalendarProviderProps {
  children: React.ReactNode;
  leadData: TLead | null;
}

const CalendarProvider = ({ children, leadData }: CalendarProviderProps) => {
  const { data: meetingsData } = useMeetings();

  const { setEvents, setLeadData, setCalendarReady, setSidebarDate, setCurrentViewTitle } =
    useCalendarStore();

  // Set lead data
  useEffect(() => {
    if (leadData) {
      setLeadData(leadData);
    }
  }, [leadData, setLeadData]);

  // Fetch meetings data and transform to calendar events
  useEffect(() => {
    if (meetingsData?.data) {
      // Filter out invalid meetings (those with undefined lead or contact_name)
      const validMeetings = meetingsData.data.filter(
        (meeting) =>
          meeting.lead && meeting.lead.contact_name && meeting.lead.contact_name !== 'undefined'
      );

      // Structure the events data
      const calendarEvents: CalendarEventType[] = validMeetings.map((meeting) => ({
        id: meeting._id,
        title: `Meeting with ${meeting.lead.contact_name}`,
        start: new Date(meeting.start_time),
        end: new Date(meeting.end_time),
        allDay: meeting.all_day ?? false,
        extendedProps: {
          eventColor: 'blue',
          leadId: meeting.lead._id,
          leadName: meeting.lead.contact_name,
          leadEmail: meeting.lead.email_from,
          leadPhone: meeting.lead.phone,
          description: meeting.description,
          videocall_url: meeting.videocall_url,
          location: 'Online',
        },
      }));

      // Set the calendar events
      setEvents(calendarEvents);
    }
  }, [meetingsData?.data, setEvents]);

  // Initialize calendar
  useEffect(() => {
    setCalendarReady(true);
    setSidebarDate(new Date());
    setCurrentViewTitle(formatCalendarViewTitle('dayGridMonth'));
  }, [setCalendarReady, setSidebarDate, setCurrentViewTitle]);

  return <>{children}</>;
};

export default CalendarProvider;
