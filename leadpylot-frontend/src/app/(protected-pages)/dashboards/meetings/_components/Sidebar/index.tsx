import React from 'react';
import Card from '@/components/ui/Card';
import CalendarSelector from './CalendarSelector';
import AttendeesSection from './AttendeesSection';
import { Attendee } from '../../types';

interface SidebarProps {
  currentYear: number;
  sidebarDate: Date | null;
  calendarReady: boolean;
  calendarRef: React.RefObject<any>;
  prevYear: () => void;
  nextYear: () => void;
  updateViewTitle: (calendarApi: any) => void;
  attendees: Attendee[];
  isAttendeesSelectorOpen: boolean;
  setIsAttendeesSelectorOpen: (isOpen: boolean) => void;
  toggleAttendeeSelection: (id: string) => void;
  handleAddAttendees: (newAttendees: Attendee[]) => void;
  removeAttendee: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentYear,
  sidebarDate,
  calendarReady,
  calendarRef,
  prevYear,
  nextYear,
  updateViewTitle,
  attendees,
  isAttendeesSelectorOpen,
  setIsAttendeesSelectorOpen,
  toggleAttendeeSelection,
  handleAddAttendees,
  removeAttendee,
}) => {
  return (
    <div className="w-64">
      <Card className="sticky top-4 rounded-lg">
        <CalendarSelector
          currentYear={currentYear}
          sidebarDate={sidebarDate}
          calendarReady={calendarReady}
          calendarRef={calendarRef}
          prevYear={prevYear}
          nextYear={nextYear}
          updateViewTitle={updateViewTitle}
        />
        <AttendeesSection
          attendees={attendees}
          isAttendeesSelectorOpen={isAttendeesSelectorOpen}
          setIsAttendeesSelectorOpen={setIsAttendeesSelectorOpen}
          toggleAttendeeSelection={toggleAttendeeSelection}
          handleAddAttendees={handleAddAttendees}
          removeAttendee={removeAttendee}
        />
      </Card>
    </div>
  );
};

export default Sidebar;
