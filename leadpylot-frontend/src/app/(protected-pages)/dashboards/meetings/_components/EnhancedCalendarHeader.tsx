'use client';

import Button from '@/components/ui/Button';
import { useCalendarStore } from '../_store/calendarStore';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface EnhancedCalendarHeaderProps {
  leadId?: string | null;
  leadName?: string | null;
}

const EnhancedCalendarHeader = ({ leadId, leadName }: EnhancedCalendarHeaderProps) => {
  const {
    currentViewTitle,
    currentView,
    setCurrentView,
    calendarReady,
    setSidebarDate,
    setCurrentYear,
    setCurrentViewTitle,
  } = useCalendarStore();

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

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">
          {leadId ? `Meetings for ${leadName}` : 'Calendar'}
        </h3>
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
          <Button
            variant={currentView === 'year' ? 'solid' : 'default'}
            size="sm"
            onClick={() => changeView('year')}
            className="px-3"
          >
            Year
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
            onClick={() => {
              setCurrentView('month');
              setSidebarDate(new Date());
              setCurrentViewTitle('May 2025');
            }}
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

export default EnhancedCalendarHeader;
