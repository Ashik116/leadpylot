import React from 'react';
import { LuX, LuCalendar, LuTag, LuUser, LuBadgeCheck } from 'react-icons/lu';
import Button from '@/components/ui/Button';
import { CalendarEventType } from '../types';
import { useDeleteMeeting } from '@/services/hooks/meetings/useMeetings';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEventType;
  onEdit?: () => void;
  setIsEditEventModalOpen: (isOpen: boolean) => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  onEdit,
  setIsEditEventModalOpen,
}) => {
  const { mutateAsync: deleteMeeting } = useDeleteMeeting();

  // Function to handle the deletion of the event
  const handleDeleteEvent = () => {
    deleteMeeting(event.id).then(() => {
      onClose();
    });
  };

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Background overlay */}
        <div
          className="bg-opacity-30 fixed inset-0 bg-gray-500 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal content */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="bg-amber-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{event.title}</h3>
              <button
                onClick={onClose}
                className="rounded-full p-1 hover:bg-amber-200"
                aria-label="Close"
              >
                <LuX size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="mb-4 flex items-center gap-2 text-gray-600">
              <LuCalendar size={18} />
              <span>
                {formatDate(event.start)}
                {event.start && (
                  <span className="ml-1">
                    {event.start.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: true,
                    })}
                  </span>
                )}
              </span>
            </div>

            {
              <div className="mb-4 flex items-center gap-2 text-gray-600">
                <LuBadgeCheck size={18} className="text-green-600" />
                <div className="flex gap-1">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                    A
                  </span>
                  <span>Administrator</span>
                </div>
              </div>
            }

            <div className="mb-4 flex items-center gap-2 text-gray-600">
              <LuTag size={18} />
              <span className="rounded-md border border-blue-500 px-2 py-0.5 text-sm text-blue-700">
                Lead/Opportunity
              </span>
            </div>

            {event.extendedProps?.leadName && (
              <div className="mb-4 flex items-center gap-2 text-gray-600">
                <LuUser size={18} />
                <span>{event.extendedProps.leadName}</span>
              </div>
            )}

            {/* Description, if available */}
            {event.extendedProps?.description && (
              <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                {event.extendedProps.description}
              </div>
            )}

            {/* Location, if available */}
            {/* no location is available in api thats why this is disabled*/}
            {/* {event.extendedProps?.location && (
              <div className="mb-4 text-sm text-gray-600">
                <strong>Location:</strong> {event.extendedProps.location}
              </div>
            )} */}
          </div>

          {/* Footer with actions */}
          <div className="flex gap-2 border-t p-3">
            <Button
              onClick={() => {
                onEdit && onEdit();
                setIsEditEventModalOpen(true);
              }}
              variant="solid"
              className="bg-purple-700 hover:bg-purple-800"
            >
              Edit
            </Button>
            <Button
              onClick={handleDeleteEvent}
              variant="plain"
              className="bg-gray-200 hover:bg-gray-300"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
