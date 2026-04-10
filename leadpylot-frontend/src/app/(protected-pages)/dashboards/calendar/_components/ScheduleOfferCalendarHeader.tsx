'use client';

import Button from '@/components/ui/Button';
import { useScheduledOffersCalendarStore } from '../_store/scheduledOffersCalendarStore';
import ApolloIcon from '@/components/ui/ApolloIcon';
import dayjs from 'dayjs';

const ScheduleOfferCalendarHeader = () => {
  const {
    currentViewTitle,
    currentView,
    setCurrentView,
    calendarReady,
    setSidebarDate,
    setCurrentYear,
    setCurrentViewTitle,
  } = useScheduledOffersCalendarStore();

  // Handle view change
  const changeView = (view: 'month' | 'week' | 'day' | 'year') => {
    setCurrentView(view);
  };

  // Handle navigation
  const handlePrev = () => {
    if (currentView === 'year') {
      setCurrentYear(new Date().getFullYear() - 1);
      return;
    }

    if (calendarReady) {
      // Get the FullCalendar API instance from the DOM
      const fcElement = document.querySelector('.fc') as HTMLElement;
      if (fcElement && (fcElement as any).__fullCalendar) {
        (fcElement as any).__fullCalendar.prev();
      } else {
        // Fallback method using DOM manipulation
        const prevButton = document.querySelector('.fc .fc-prev-button') as HTMLButtonElement;
        if (prevButton) {
          prevButton.click();
        }
      }
    }
  };

  const handleNext = () => {
    if (currentView === 'year') {
      setCurrentYear(new Date().getFullYear() + 1);
      return;
    }

    if (calendarReady) {
      // Get the FullCalendar API instance from the DOM
      const fcElement = document.querySelector('.fc') as HTMLElement;
      if (fcElement && (fcElement as any).__fullCalendar) {
        (fcElement as any).__fullCalendar.next();
      } else {
        // Fallback method using DOM manipulation
        const nextButton = document.querySelector('.fc .fc-next-button') as HTMLButtonElement;
        if (nextButton) {
          nextButton.click();
        }
      }
    }
  };

  // Handle Today button click
  const handleToday = () => {
    if (!calendarReady) return;

    // Get the FullCalendar API instance from the DOM
    const fcElement = document.querySelector('.fc') as HTMLElement;
    const calendarApi = fcElement && (fcElement as any).__fullCalendar;

    if (!calendarApi) {
      // Fallback: just update state
      setCurrentView('month');
      setSidebarDate(new Date());
      setCurrentViewTitle(dayjs().format('MMMM YYYY'));
      return;
    }

    const today = new Date();
    const currentView = calendarApi.view;

    // Get the currently displayed date range
    let currentDisplayDate: Date;
    if (currentView.type === 'dayGridMonth') {
      // For month view, use currentStart (the actual month being displayed)
      currentDisplayDate = currentView.currentStart || currentView.activeStart;
    } else {
      // For week/day view, use activeStart
      currentDisplayDate = currentView.activeStart;
    }

    // Compare current month/year with today's month/year
    const currentMonth = currentDisplayDate.getMonth();
    const currentYear = currentDisplayDate.getFullYear();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    const isDifferentMonth = currentMonth !== todayMonth || currentYear !== todayYear;

    if (isDifferentMonth) {
      // Navigate to today's month
      calendarApi.gotoDate(today);

      // Update state to reflect the navigation
      setSidebarDate(today);
      setCurrentYear(todayYear);

      // Update view title based on current view type
      if (currentView.type === 'dayGridMonth') {
        setCurrentViewTitle(dayjs(today).format('MMMM YYYY'));
      } else if (currentView.type === 'timeGridWeek') {
        const weekStart = dayjs(today).startOf('week');
        const weekEnd = dayjs(today).endOf('week');
        setCurrentViewTitle(
          `${weekStart.format('MMM D')} – ${weekEnd.format('MMM D')}, ${todayYear}`
        );
      } else {
        setCurrentViewTitle(dayjs(today).format('MMMM D, YYYY'));
      }
    } else {
      // Already in current month, just scroll to today
      calendarApi.gotoDate(today);
    }
  };

  console.log("currentViewTitle", currentViewTitle);

  return (
    <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Scheduled Offers</h3>
        <p className="mt-1 text-sm text-gray-500">{currentViewTitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
          <Button
            variant={currentView === 'month' ? 'solid' : 'default'}
            size="sm"
            onClick={() => changeView('month')}
            className="px-3"
          >
            Month
          </Button>
          <Button
            variant={currentView === 'week' ? 'solid' : 'default'}
            size="sm"
            onClick={() => changeView('week')}
            className="px-3"
          >
            Week
          </Button>
          <Button
            variant={currentView === 'day' ? 'solid' : 'default'}
            size="sm"
            onClick={() => changeView('day')}
            className="px-3"
          >
            Day
          </Button>
        </div>

        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
          <Button
            variant="default"
            size="sm"
            icon={<ApolloIcon name="chevron-arrow-left" />}
            onClick={handlePrev}
            className="px-2"
          />
          <Button
            variant="default"
            size="sm"
            icon={<ApolloIcon name="calendar" />}
            onClick={handleToday}
            className="px-2"
          >
            Today
          </Button>
          <Button
            variant="default"
            size="sm"
            icon={<ApolloIcon name="chevron-arrow-right" />}
            onClick={handleNext}
            className="px-2"
          />
        </div>
      </div>
    </div>
  );
};

export default ScheduleOfferCalendarHeader;

