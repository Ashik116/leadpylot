import { useState } from 'react';
import { Attendee } from '../types';

export const useAttendees = () => {
  const [attendees, setAttendees] = useState<Attendee[]>([
    { id: '1', name: 'Administrator', role: 'Admin', avatar: 'A', selected: true },
    {
      id: 'everyone',
      name: "Everybody's calendars",
      role: 'System',
      avatar: '🗓️',
      selected: false,
    },
  ]);
  const [isAttendeesSelectorOpen, setIsAttendeesSelectorOpen] = useState(false);

  // Toggle attendee selection
  const toggleAttendeeSelection = (id: string) => {
    setAttendees((prevAttendees) =>
      prevAttendees.map((attendee) =>
        attendee.id === id ? { ...attendee, selected: !attendee.selected } : attendee
      )
    );
  };

  // Add new attendees from selector
  const handleAddAttendees = (newAttendees: Attendee[]) => {
    // Filter out attendees that are already in the list
    const filteredNewAttendees = newAttendees.filter(
      (newAttendee) => !attendees.some((existingAttendee) => existingAttendee.id === newAttendee.id)
    );

    // Add the new attendees to the list
    if (filteredNewAttendees.length > 0) {
      setAttendees((prevAttendees) => [
        ...prevAttendees,
        ...filteredNewAttendees.map((attendee) => ({
          ...attendee,
          selected: true, // New attendees are selected by default
        })),
      ]);
    }

    // Close the attendees selector
    setIsAttendeesSelectorOpen(false);
  };

  // Remove an attendee
  const removeAttendee = (id: string) => {
    setAttendees((prevAttendees) => prevAttendees.filter((a) => a.id !== id));
  };

  return {
    attendees,
    setAttendees,
    isAttendeesSelectorOpen,
    setIsAttendeesSelectorOpen,
    toggleAttendeeSelection,
    handleAddAttendees,
    removeAttendee,
  };
};
