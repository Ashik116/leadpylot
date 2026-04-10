// Types for the meetings module

export interface Attendee {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  selected?: boolean;
}

export interface CalendarEventType {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  extendedProps: {
    eventColor: string;
    description?: string;
    videocall_url?: string;
    leadId?: string;
    leadEmail?: string;
    leadPhone?: string;
    leadName?: string;
    recurring?: boolean;
  };
}
