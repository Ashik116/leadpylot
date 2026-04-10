'use client';

import CalendarView from '@/components/shared/CalendarView';
import RoleGuard from '@/components/shared/RoleGuard';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { Lead, TLead } from '@/services/LeadsService';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CalendarEventType } from '../../meetings/_components/eventUtils';
import { useScheduledOffersCalendarStore } from '../_store/scheduledOffersCalendarStore';

// Extend dayjs with UTC plugin
dayjs.extend(utc);

// Extend CalendarEventType to support date strings for allDay events
// FullCalendar accepts date strings (YYYY-MM-DD) for allDay events to avoid timezone issues
type ScheduleOfferEventType = Omit<CalendarEventType, 'start' | 'end'> & {
  start: Date | string;
  end: Date | string;
  allDay: true;
};

// Extend HTMLElement to include the FullCalendar API
declare global {
  interface HTMLElement {
    __fullCalendar?: any;
  }
}

interface ScheduleOfferCalendarProps {
  leadsData: (Lead | TLead)[];
  isLoading?: boolean;
}

const ScheduleOfferCalendar = ({ leadsData, isLoading }: ScheduleOfferCalendarProps) => {
  const calendarRef = useRef<FullCalendar>(null);
  const router = useRouter();

  const {
    events,
    currentView,
    setEvents,
    setCurrentViewTitle,
    setSidebarDate,
    setCurrentYear,
    setCalendarReady,
    setCurrentView,
  } = useScheduledOffersCalendarStore();

  // Transform leads data into calendar events
  const calendarEvents = useMemo(() => {
    if (!leadsData || !Array.isArray(leadsData)) return [];

    const events: ScheduleOfferEventType[] = [];
    let appointmentIndex = 0; // Track appointment index for unique color assignment

    // Expanded color palette for unique appointment colors
    const colors = [
      'blue',
      'green',
      'orange',
      'purple',
      'red',
      'yellow',
      'cyan',
      'pink',
      'indigo',
      'teal',
      'amber',
      'lime',
    ];
    leadsData.forEach((lead) => {
      // Get appointments from lead.appointments
      const appointments = (lead as any)?.appointments || [];

      appointments.forEach((appointment: any) => {
        const scheduledDate = appointment?.appointment_date;
        const scheduledTime = appointment?.appointment_time;
        const handoverNotes = appointment?.description;

        if (!scheduledDate) return;

        const leadId = lead._id?.toString() || '';
        const leadName = lead.contact_name || 'Unknown Lead';
        const appointmentId = appointment._id?.toString() || '';
        // Extract agent name from appointment.created_by
        const agentName = appointment?.created_by?.login || '';

        // Parse the date string - extract only the date part (YYYY-MM-DD)
        // CRITICAL: Extract date BEFORE any timezone conversion happens
        let dateStr = '';

        if (typeof scheduledDate === 'string') {
          // Extract just the date part (YYYY-MM-DD) from ISO string BEFORE parsing
          // This ensures we get the exact date from the string, not after timezone conversion
          dateStr = scheduledDate.split('T')[0];
        } else {
          // If it's already a Date object, we need to be careful
          // Extract the UTC date components to get the original intended date
          const utcDate = new Date(scheduledDate);
          const year = utcDate.getUTCFullYear();
          const month = utcDate.getUTCMonth() + 1;
          const day = utcDate.getUTCDate();
          dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        // Format time to 12-hour format with AM/PM
        let formattedTime = 'No time';
        if (scheduledTime) {
          try {
            // Parse time string (e.g., "11:10", "13:04")
            const [hours, minutes] = scheduledTime.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              // Create a dayjs object with today's date and the parsed time
              const timeObj = dayjs().hour(hours).minute(minutes).second(0);
              formattedTime = timeObj.format('hh:mm A'); // e.g., "01:14 PM", "11:10 AM"
            }
          } catch {
            // If parsing fails, use original time string
            formattedTime = scheduledTime;
          }
        }

        // Create a unique event ID for each appointment
        const eventId = `${leadId}-${appointmentId}-${dateStr}-${formattedTime}`;

        // Assign unique color to each appointment sequentially
        // Each appointment gets its own unique background color
        const eventColor = colors[appointmentIndex % colors.length];
        appointmentIndex++;

        // Create event for this appointment
        // For allDay events, FullCalendar accepts date strings in YYYY-MM-DD format
        // This completely avoids any Date object timezone conversion issues
        events.push({
          id: eventId,
          title: appointment.title || leadName, // Use appointment title if available, otherwise use lead name
          start: dateStr, // Use date string directly for allDay events
          end: dateStr,
          allDay: true, // Set to true to avoid timezone shifts in FullCalendar
          extendedProps: {
            eventColor: eventColor,
            leadId: leadId,
            leadName: leadName,
            agentName: agentName,
            scheduledTime: formattedTime,
            handoverNotes: handoverNotes,
            appointmentId: appointment._id,
          } as any,
        });
      });
    });

    return events;
  }, [leadsData]);

  // Update events when calendarEvents changes
  // Cast to CalendarEventType[] for the store (FullCalendar handles string dates internally)
  useEffect(() => {
    setEvents(calendarEvents as any);
  }, [calendarEvents, setEvents]);

  // Define updateViewTitle with useCallback to prevent unnecessary re-renders
  const updateViewTitle = useCallback(
    (calendarApi: any) => {
      if (!calendarApi) return;

      try {
        const view = calendarApi.view;

        // CRITICAL: For month view, use currentStart instead of activeStart
        // activeStart is the first visible day in the grid (might be from previous month)
        // currentStart is the actual start of the month being displayed
        const start = view.type === 'dayGridMonth' ? view.currentStart : view.activeStart;

        // Update sidebar date based on the current view
        if (start) {
          setSidebarDate(new Date(start));
        }

        // Format the title based on the current view using the correct date
        let title = '';
        if (view.type === 'dayGridMonth') {
          // Use currentStart which gives us the actual month being displayed
          // Extract local date components directly
          const year = start.getFullYear();
          const month = start.getMonth(); // 0-11 (0 = January, 11 = December)

          // Format directly using month names to avoid any timezone conversion
          const monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ];
          title = `${monthNames[month]} ${year}`;
        } else if (view.type === 'timeGridWeek') {
          // For week view, use activeStart
          const weekStart = new Date(start);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6); // End of week

          const weekEndYear = weekEnd.getFullYear();
          const weekEndMonth = weekEnd.getMonth();
          const weekEndDay = weekEnd.getDate();
          const weekStartMonth = weekStart.getMonth();
          const weekStartDay = weekStart.getDate();

          const monthNames = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
          title = `${monthNames[weekStartMonth]} ${weekStartDay} – ${monthNames[weekEndMonth]} ${weekEndDay}, ${weekEndYear}`;
        } else {
          // For day view, use activeStart
          const year = start.getFullYear();
          const month = start.getMonth();
          const day = start.getDate();

          const monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ];
          title = `${monthNames[month]} ${day}, ${year}`;
        }
        setCurrentViewTitle(title);
      } catch {
        // Silent error handling
      }
    },
    [setSidebarDate, setCurrentViewTitle]
  );

  // Initialize calendar and handle view changes
  useEffect(() => {
    if (calendarRef.current) {
      try {
        const calendarApi = calendarRef.current.getApi();
        setCalendarReady(true);
        updateViewTitle(calendarApi);

        // Defer view changes to avoid flushSync error during React render
        // FullCalendar's changeView uses flushSync internally, which cannot be called during render
        setTimeout(() => {
          try {
            // Set the view based on currentView state
            if (currentView === 'month') {
              calendarApi.changeView('dayGridMonth');
            } else if (currentView === 'week') {
              calendarApi.changeView('timeGridWeek');
            } else if (currentView === 'day') {
              calendarApi.changeView('timeGridDay');
            }
          } catch {
            // Silent error handling
          }
        }, 0);

        // Store the API reference for external access
        const fcElement = document.querySelector('.fc') as HTMLElement;
        if (fcElement) {
          (fcElement as any).__fullCalendar = calendarApi;
        }
      } catch {
        // Silent error handling
      }
    }
  }, [setCalendarReady, currentView, updateViewTitle]);

  // Handle event click - redirect to lead details
  const handleEventClick = (arg: EventClickArg) => {
    const { extendedProps } = arg.event;
    const leadId = (extendedProps as any)?.leadId;

    if (!leadId) return;

    // Update navigation position to clicked lead before navigating
    try {
      const navStore = useFilterAwareLeadsNavigationStore.getState();
      const index = navStore.findFilteredIndexById(leadId);

      if (index >= 0) {
        navStore.setCurrentFilteredIndex(index);
      } else {
        // Try to find it in the current page data as fallback
        const currentData = leadsData || [];
        const fallbackIndex = currentData.findIndex((item: any) => item._id?.toString() === leadId);
        if (fallbackIndex >= 0) {
          navStore.setCurrentFilteredIndex(fallbackIndex);
        }
      }
    } catch {
      // Error handling without console.log
    }

    // Navigate to lead details page
    router.push(`/dashboards/leads/${leadId}`);
  };

  // Handle date cell click - redirect to first lead on that date
  const handleDateSelect = (arg: any) => {
    // Find first event on this date
    // Format clicked date as YYYY-MM-DD
    const clickedDate = dayjs(arg.start).format('YYYY-MM-DD');
    const eventOnDate = events.find((event) => {
      // Handle both string and Date object for event.start
      const eventDate =
        typeof event.start === 'string' ? event.start : dayjs(event.start).format('YYYY-MM-DD');
      return eventDate === clickedDate;
    });

    if (eventOnDate && (eventOnDate.extendedProps as any)?.leadId) {
      const leadId = (eventOnDate.extendedProps as any).leadId;

      // Update navigation position
      try {
        const navStore = useFilterAwareLeadsNavigationStore.getState();
        const index = navStore.findFilteredIndexById(leadId);

        if (index >= 0) {
          navStore.setCurrentFilteredIndex(index);
        } else {
          const currentData = leadsData || [];
          const fallbackIndex = currentData.findIndex(
            (item: any) => item._id?.toString() === leadId
          );
          if (fallbackIndex >= 0) {
            navStore.setCurrentFilteredIndex(fallbackIndex);
          }
        }
      } catch {
        // Error handling
      }

      router.push(`/dashboards/leads/${leadId}`);
    }
  };

  // Handle dates set (when calendar view changes)
  const handleDatesSet = (arg: DatesSetArg) => {
    if (calendarRef.current) {
      try {
        const calendarApi = calendarRef.current.getApi();
        updateViewTitle(calendarApi);

        // Update current year based on the view
        const viewStart = new Date(arg.start);
        setCurrentYear(viewStart.getFullYear());

        // Update sidebar date
        setSidebarDate(viewStart);
      } catch {
        // Silent error handling
      }
    }
  };

  // Handle view change
  const handleViewChange = (viewType: string) => {
    // Map the view to our state format
    if (viewType === 'timeGridWeek') {
      setCurrentView('week');
    } else if (viewType === 'timeGridDay') {
      setCurrentView('day');
    } else if (viewType === 'dayGridMonth') {
      setCurrentView('month');
    }
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden p-8">
        <div className="flex items-center justify-center">
          <div className="text-gray-500">Loading calendar...</div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-auto p-0">
        <CalendarView
          ref={calendarRef}
          events={events}
          editable={false}
          selectable={true}
          selectMirror={false}
          dayMaxEvents={3}
          weekends={true}
          nowIndicator={true}
          initialView={
            currentView === 'month'
              ? 'dayGridMonth'
              : currentView === 'week'
                ? 'timeGridWeek'
                : 'timeGridDay'
          }
          headerToolbar={false}
          select={handleDateSelect}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          viewDidMount={(info) => handleViewChange(info.view.type)}
          dayMaxEventRows={5}
          moreLinkClick="popover"
          views={{
            dayGridMonth: {
              dayMaxEvents: 3,
            },
            timeGridWeek: {
              dayMaxEvents: true,
              slotDuration: '00:30:00',
            },
            timeGridDay: {
              dayMaxEvents: true,
              slotDuration: '00:30:00',
            },
          }}
          // For allDay events with date strings, don't set timeZone
          // This allows FullCalendar to interpret date strings (YYYY-MM-DD) as literal dates
          height="auto"
          dayCellContent={(arg) => {
            // Get today's date in YYYY-MM-DD format
            const today = dayjs().format('YYYY-MM-DD');
            const cellDate = dayjs(arg.date).format('YYYY-MM-DD');
            const isToday = today === cellDate;

            // Return JSX with date number and "Today" badge if it's today
            return (
              <div className="fc-daygrid-day-number-wrapper flex items-center justify-between gap-1">
                 {isToday && (
                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-semibold leading-none text-white"
                    style={{ backgroundColor: 'var(--color-ocean-2)' }}
                  >
                    Today
                  </span>
                )}
                <span className="fc-daygrid-day-number">{arg.dayNumberText}</span>
 
               
              </div>
            );
          }}
          eventContent={(arg) => {
            const { extendedProps } = arg.event;
            const eventColor = extendedProps?.eventColor || 'blue';
            const scheduledTime = (extendedProps as any)?.scheduledTime || '';
            const handoverNotes = (extendedProps as any)?.handoverNotes;
            const leadName = (extendedProps as any)?.leadName || arg.event.title;
            const agentName = (extendedProps as any)?.agentName || '';

            // Map color names to actual color classes
            // Expanded color palette matching the date color assignment
            const colorMap: Record<string, string> = {
              blue: 'bg-[#bce9fb]',
              green: 'bg-[#bee9d3]',
              orange: 'bg-[#ffc6ab]',
              purple: 'bg-[#ccbbfc]',
              red: 'bg-[#fbddd9]',
              yellow: 'bg-[#ffd993]',
              cyan: 'bg-[#a5f3fc]',
              pink: 'bg-[#fce7f3]',
              indigo: 'bg-[#e0e7ff]',
              teal: 'bg-[#ccfbf1]',
              amber: 'bg-[#fef3c7]',
              lime: 'bg-[#ecfccb]',
            };
            const bgColor = colorMap[eventColor] || colorMap.blue;

            return (
              <div
                className={`custom-calendar-event ${bgColor} cursor-pointer rounded border-0 p-1 text-gray-900 transition-colors`}
                style={{ border: 'none !important', outline: 'none' }}
              >
                <div className="line-clamp-1 flex items-center gap-1.5 truncate">
                  {scheduledTime && (
                    <div className="flex items-center gap-1">
                      <ApolloIcon name="clock-eight" className="text-xs" />
                      <span className="text-xs font-medium">{scheduledTime}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <ApolloIcon name="user" className="text-xs" />
                    <span className="text-sm font-medium">
                      {leadName}

                      <RoleGuard role={Role.ADMIN}>
                        {agentName && (
                          <span className="ml-1 text-xs opacity-75">({agentName})</span>
                        )}
                      </RoleGuard>
                    </span>
                  </div>
                </div>
                {handoverNotes && (
                  <div className="mt-1 flex items-start gap-1 text-xs opacity-90">
                    <ApolloIcon name="notes" className="mt-0.5 shrink-0 text-xs" />
                    <span className="line-clamp-2 truncate pt-[2px]">{handoverNotes}</span>
                  </div>
                )}
              </div>
            );
          }}
        />
      </Card>
    </>
  );
};

export default ScheduleOfferCalendar;
