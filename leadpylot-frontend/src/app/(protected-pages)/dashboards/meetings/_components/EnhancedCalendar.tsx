'use client';

import { useRef, useEffect, useCallback } from 'react';
import CalendarView from '@/components/shared/CalendarView';
import Card from '@/components/ui/Card';
import { useCalendarStore } from '../_store/calendarStore';
import { formatCalendarViewTitle } from './eventUtils';
import YearGrid from './YearGrid';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg, DateSelectArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import dayjs from 'dayjs';

// Extend HTMLElement to include the FullCalendar API
declare global {
  interface HTMLElement {
    __fullCalendar?: any;
  }
}

const EnhancedCalendar = () => {
  const calendarRef = useRef<FullCalendar>(null);

  const {
    events,
    currentView,
    selectedDate,
    setSelectedDate,
    setIsAddEventOpen,
    setSelectedEvent,
    setIsEventModalOpen,
    setCurrentViewTitle,
    setSidebarDate,
    setCurrentYear,
    updateEvent,
    setCalendarReady,
  } = useCalendarStore();

  // Define updateViewTitle with useCallback to prevent unnecessary re-renders
  const updateViewTitle = useCallback(
    (calendarApi: any) => {
      if (!calendarApi) return;

      try {
        const view = calendarApi.view;
        const start = view.activeStart;

        // Update sidebar date based on the current view
        if (start) {
          setSidebarDate(new Date(start));
        }

        // Format the title based on the current view
        const title = formatCalendarViewTitle(view.type);
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

        // Set the view based on currentView state
        if (currentView === 'month') {
          calendarApi.changeView('dayGridMonth');
        } else if (currentView === 'week') {
          calendarApi.changeView('timeGridWeek');
        } else if (currentView === 'day') {
          calendarApi.changeView('timeGridDay');
        }

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

  // Handle date selection
  const handleDateSelect = (arg: DateSelectArg) => {
    // Check if the date is in the past
    const clickedDate = new Date(arg.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If the date is in the past, don't open the dialog
    if (clickedDate < today) {
      return;
    }

    // Set the selected date
    setSelectedDate(clickedDate);

    // Open the add event dialog
    setIsAddEventOpen(true);
  };

  // Handle event click
  const handleEventClick = (arg: EventClickArg) => {
    const { id, title, start, end, extendedProps } = arg.event;

    setSelectedEvent({
      id: id,
      title: title,
      start: start || new Date(),
      end: end ? new Date(end.valueOf()) : new Date(),
      allDay: arg.event.allDay,
      extendedProps: extendedProps as any,
    });

    setIsEventModalOpen(true);
  };

  // Handle event drag and drop
  const handleEventDrop = (arg: EventDropArg) => {
    const { id, title, start, end, extendedProps, allDay } = arg.event;

    const updatedEvent = {
      id,
      title,
      start: start || new Date(),
      end: end ? new Date(end.valueOf()) : new Date(),
      allDay: allDay,
      extendedProps: extendedProps as any,
    };

    updateEvent(updatedEvent);
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
      useCalendarStore.getState().setCurrentView('week');
    } else if (viewType === 'timeGridDay') {
      useCalendarStore.getState().setCurrentView('day');
    } else if (viewType === 'dayGridMonth') {
      useCalendarStore.getState().setCurrentView('month');
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      {currentView === 'year' ? (
        <div className="p-4">
          <YearGrid
            year={dayjs().year()}
            selectedDate={selectedDate}
            onDateClick={(date) => {
              setSelectedDate(date);
              setIsAddEventOpen(true);
            }}
          />
        </div>
      ) : (
        <CalendarView
          ref={calendarRef}
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
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
          eventDrop={handleEventDrop}
          datesSet={handleDatesSet}
          viewDidMount={(info) => handleViewChange(info.view.type)}
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
          height="auto"
          eventContent={(arg) => {
            const { extendedProps } = arg.event;
            const eventColor = extendedProps?.eventColor || 'blue';

            return (
              <div className={`custom-calendar-event bg-${eventColor}`}>
                <div className="flex items-center gap-1">
                  {arg.timeText && <span className="text-xs opacity-75">{arg.timeText}</span>}
                  <span className="font-medium">{arg.event.title}</span>
                </div>

                {extendedProps?.location && (
                  <div className="mt-1 text-xs opacity-80">📍 {extendedProps.location}</div>
                )}

                {extendedProps?.leadName && (
                  <div className="mt-1 text-xs font-medium">👤 {extendedProps.leadName}</div>
                )}
              </div>
            );
          }}
        />
      )}
    </Card>
  );
};

export default EnhancedCalendar;
