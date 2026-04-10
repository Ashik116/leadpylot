import React from 'react';
import { LuPlus, LuX } from 'react-icons/lu';
import AttendeesSelector from '../AttendeesSelector';
import { Attendee } from '../../types';

interface AttendeesSectionProps {
  attendees: Attendee[];
  isAttendeesSelectorOpen: boolean;
  setIsAttendeesSelectorOpen: (isOpen: boolean) => void;
  toggleAttendeeSelection: (id: string) => void;
  handleAddAttendees: (newAttendees: Attendee[]) => void;
  removeAttendee: (id: string) => void;
}

const AttendeesSection: React.FC<AttendeesSectionProps> = ({
  attendees,
  isAttendeesSelectorOpen,
  setIsAttendeesSelectorOpen,
  toggleAttendeeSelection,
  handleAddAttendees,
  removeAttendee,
}) => {
  return (
    <div className="border-t p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-medium">Attendees</h3>
        <button className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100">
          <span className="rotate-0 transform transition-transform">▼</span>
        </button>
      </div>

      <div className="space-y-2">
        {attendees.map((attendee) => (
          <div key={attendee.id} className="group relative flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={attendee.selected}
              onChange={() => toggleAttendeeSelection(attendee.id)}
            />
            <div
              className={`mr-2 flex h-6 w-6 items-center justify-center rounded-full ${
                attendee.id === '1' ? 'bg-green-500 text-white' : 'bg-gray-200'
              }`}
            >
              {attendee.avatar || attendee.name.charAt(0)}
            </div>
            <span className="truncate text-sm">{attendee.name}</span>

            {/* Add remove button that appears on hover */}
            {attendee.id !== '1' && ( // Don't allow removing Administrator
              <button
                onClick={() => removeAttendee(attendee.id)}
                className="absolute right-0 hidden h-6 w-6 items-center justify-center rounded-full text-gray-500 group-hover:flex hover:bg-gray-200"
                aria-label="Remove attendee"
              >
                <LuX size={14} />
              </button>
            )}
          </div>
        ))}

        <div className="relative mt-2">
          <button
            className="flex items-center text-blue-500 hover:text-blue-700"
            onClick={() => setIsAttendeesSelectorOpen(!isAttendeesSelectorOpen)}
          >
            <LuPlus size={16} className="mr-1" /> Add Attendees
          </button>

          {isAttendeesSelectorOpen && (
            <AttendeesSelector
              isOpen={isAttendeesSelectorOpen}
              onClose={() => setIsAttendeesSelectorOpen(false)}
              onSelect={handleAddAttendees}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendeesSection;
