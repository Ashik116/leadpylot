'use client';

import Loading from '@/components/shared/Loading';
import { useLead } from '@/services/hooks/useLeads';
import { useSearchParams } from 'next/navigation';
import { useState, useRef } from 'react';
import { TLead } from '@/services/LeadsService';

// Import components
import AddMeetingDialog from './_components/AddMeetingDialog';
import EventDetailsModal from './_components/EventDetailsModal';
import LeadInfoCard from './_components/LeadInfoCard';
import EditEventDetailsModal from './_components/EditEventDetailsModal';
import Sidebar from './_components/Sidebar';

// Import new calendar components
import CalendarProvider from './_components/CalendarProvider';
import EnhancedCalendar from './_components/EnhancedCalendar';
import EnhancedCalendarHeader from './_components/EnhancedCalendarHeader';

// Import hooks
import { useAttendees } from './hooks/useAttendees';
import { useCalendarStore } from './_store/calendarStore';

// Import CSS file
import './styles/calendar.css';

export default function MeetingsPage() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');
  const leadName = searchParams.get('leadName') || 'Unknown';
  const [leadData, setLeadData] = useState<TLead | null>(null);
  const sidebarRef = useRef(null); // Create ref at component level

  // Fetch lead data if leadId is provided
  const { data: lead, isLoading } = useLead(leadId || '');

  // Use the attendees hook
  const attendeeManager = useAttendees();

  // Get state from calendar store
  const {
    selectedDate,
    isAddEventOpen,
    isEditEventModalOpen,
    isEventModalOpen,
    selectedEvent,
    currentYear,
    sidebarDate,
    calendarReady,
    setIsAddEventOpen,
    setIsEventModalOpen,
    setIsEditEventModalOpen,
  } = useCalendarStore();

  // Update lead data when it changes
  if (lead && !leadData) {
    setLeadData(lead);
  }

  if (isLoading) {
    return <Loading className="absolute inset-0" loading={true} />;
  }

  return (
    <CalendarProvider leadData={leadData}>
      <div className="container mx-auto flex max-w-full px-4">
        <div className="flex w-full gap-4">
          <div className="grow">
            <EnhancedCalendarHeader leadId={leadId} leadName={leadName} />

            {leadId && leadData && <LeadInfoCard leadData={leadData} />}

            <EnhancedCalendar />

            {/* This modal is opened when the user clicks on a date in the calendar */}
            {selectedDate && isAddEventOpen && (
              <AddMeetingDialog
                key={selectedDate.getTime()}
                isOpen={true}
                onClose={() => setIsAddEventOpen(false)}
                lead={leadData}
                selectedDate={selectedDate}
                onAddMeeting={() => setIsAddEventOpen(false)}
              />
            )}

            {/* Event details edit modal */}
            {isEditEventModalOpen && selectedEvent && (
              <EditEventDetailsModal
                isOpen={isEditEventModalOpen}
                onClose={() => setIsEditEventModalOpen(false)}
                event={selectedEvent}
              />
            )}

            {/* Event details modal */}
            {selectedEvent && (
              <EventDetailsModal
                setIsEditEventModalOpen={setIsEditEventModalOpen}
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                event={selectedEvent}
                onEdit={() => {
                  setIsEventModalOpen(false);
                  setIsEditEventModalOpen(true);
                }}
              />
            )}
          </div>

          <Sidebar
            currentYear={currentYear}
            sidebarDate={sidebarDate}
            calendarReady={calendarReady}
            calendarRef={sidebarRef} // Use the ref created at component level
            prevYear={() => useCalendarStore.getState().setCurrentYear(currentYear - 1)}
            nextYear={() => useCalendarStore.getState().setCurrentYear(currentYear + 1)}
            updateViewTitle={() => { }} // This is handled internally now
            attendees={attendeeManager.attendees}
            isAttendeesSelectorOpen={attendeeManager.isAttendeesSelectorOpen}
            setIsAttendeesSelectorOpen={attendeeManager.setIsAttendeesSelectorOpen}
            toggleAttendeeSelection={attendeeManager.toggleAttendeeSelection}
            handleAddAttendees={attendeeManager.handleAddAttendees}
            removeAttendee={attendeeManager.removeAttendee}
          />
        </div>
      </div>
    </CalendarProvider>
  );
}
