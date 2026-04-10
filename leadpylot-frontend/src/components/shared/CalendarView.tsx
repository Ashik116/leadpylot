import classNames from '@/utils/classNames';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';
import { forwardRef } from 'react';

type EventColors = Record<
  string,
  {
    bg: string;
    text: string;
  }
>;

interface CalendarViewProps extends CalendarOptions {
  wrapperClass?: string;
  eventColors?: (colors: EventColors) => EventColors;
}

const defaultColorList: Record<
  string,
  {
    bg: string;
    text: string;
  }
> = {
  red: {
    bg: 'bg-[#fbddd9]',
    text: 'text-gray-900',
  },
  orange: {
    bg: 'bg-[#ffc6ab]',
    text: 'text-gray-900',
  },
  yellow: {
    bg: 'bg-[#ffd993]',
    text: 'text-gray-900',
  },
  green: {
    bg: 'bg-[#bee9d3]',
    text: 'text-gray-900',
  },
  blue: {
    bg: 'bg-[#bce9fb]',
    text: 'text-gray-900',
  },
  purple: {
    bg: 'bg-[#ccbbfc]',
    text: 'text-gray-900',
  },
};

const CalendarView = forwardRef<FullCalendar, CalendarViewProps>((props, ref) => {
  const { wrapperClass, eventColors = () => defaultColorList, ...rest } = props;

  return (
    <div className={classNames('calendar', wrapperClass)}>
      <FullCalendar
        ref={ref}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'title',
          center: '',
          right: 'dayGridMonth,timeGridWeek,timeGridDay prev,next',
        }}
        eventContent={(arg) => {
          const { extendedProps } = arg.event;
          const { isEnd, isStart } = arg;
          return (
            <div
              className={classNames(
                'custom-calendar-event',
                extendedProps.eventColor
                  ? (eventColors(defaultColorList) || defaultColorList)[extendedProps.eventColor]
                    ?.bg
                  : '',
                extendedProps.eventColor
                  ? (eventColors(defaultColorList) || defaultColorList)[extendedProps.eventColor]
                    ?.text
                  : '',
                isEnd &&
                !isStart &&
                '!rtl:rounded-tr-none !rtl:rounded-br-none rounded-tl-none! rounded-bl-none!',
                !isEnd &&
                isStart &&
                '!rtl:rounded-tl-none !rtl:rounded-bl-none rounded-tr-none! rounded-br-none!'
              )}
            >
              {!(isEnd && !isStart) && <span>{arg.timeText}</span>}
              <span className="ml-1 font-bold rtl:mr-1">{arg.event.title}</span>
            </div>
          );
        }}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        dayHeaderContent={({ date, view }) => {
          // Only show date numbers in week and day views, not in month view
          const isMonthView = view.type === 'dayGridMonth';

          return (
            <div className="fc-day-header">
              <div className="text-xs font-medium">
                {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)}
              </div>
              {!isMonthView && <div className="text-sm font-bold">{date.getDate()}</div>}
            </div>
          );
        }}
        {...rest}
      />
    </div>
  );
});

CalendarView.displayName = 'CalendarView';

export default CalendarView;
