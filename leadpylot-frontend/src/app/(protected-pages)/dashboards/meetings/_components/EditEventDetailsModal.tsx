'use client';

import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import { CalendarEventType } from '../types';
import { UpdateMeetingRequestType } from '@/services/MeetingsService';
import { useUpdateMeeting } from '@/services/hooks/meetings/useMeetings';
import { useForm, Controller } from 'react-hook-form';
import { LuX, LuSave } from 'react-icons/lu';
import { useEffect } from 'react';

interface EditEventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEventType | null;
}

const EditEventDetailsModal = ({ isOpen, onClose, event }: EditEventDetailsModalProps) => {
  const { mutateAsync: updateMeeting, isPending } = useUpdateMeeting();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<UpdateMeetingRequestType>({
    defaultValues: {
      all_day: false,
      start_time: '',
      end_time: '',
      description: '',
      videocall_url: '',
    },
  });

  // Set form values when event changes
  useEffect(() => {
    if (event) {
      // Format dates to local ISO string without timezone offset for datetime-local input
      const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      // Set the form values with properly formatted dates
      setValue('start_time', formatDateForInput(event.start));
      setValue('end_time', formatDateForInput(event.end));
      setValue('all_day', event.allDay || false);
      setValue('description', event.extendedProps.description || '');

      // Set videocall_url if available in extendedProps
      if (event.extendedProps.videocall_url) {
        setValue('videocall_url', event.extendedProps.videocall_url);
      }
    }
  }, [event, setValue]);

  const onSubmit = async (data: UpdateMeetingRequestType) => {
    if (!event) return;

    try {
      // Convert local datetime-local format to ISO string for API
      const formatToISOString = (dateTimeLocalString: string | undefined): string => {
        if (!dateTimeLocalString) return '';
        // Create a date object in local timezone
        const date = new Date(dateTimeLocalString);
        // Convert to ISO string for API
        return date.toISOString();
      };

      // Format the request according to the backend API endpoint
      await updateMeeting({
        id: event.id,
        data: {
          start_time: formatToISOString(data.start_time),
          end_time: formatToISOString(data.end_time),
          all_day: data.all_day,
          videocall_url: data.videocall_url,
          description: data.description,
        },
      });
      onClose();
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} closable={false}>
      <div className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Meeting</h2>
          <button className="rounded-full p-1 text-gray-500 hover:bg-gray-100" onClick={onClose}>
            <LuX size={20} />
          </button>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormItem
              label="Start Time"
              invalid={!!errors.start_time}
              errorMessage={errors.start_time?.message}
            >
              <Controller
                name="start_time"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      // Store the input value directly for datetime-local
                      field.onChange(e.target.value);
                    }}
                  />
                )}
              />
            </FormItem>

            <FormItem
              label="End Time"
              invalid={!!errors.end_time}
              errorMessage={errors.end_time?.message}
            >
              <Controller
                name="end_time"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      // Store the input value directly for datetime-local
                      field.onChange(e.target.value);
                    }}
                  />
                )}
              />
            </FormItem>

            <FormItem
              label="All Day"
              invalid={!!errors.all_day}
              errorMessage={errors.all_day?.message}
            >
              <Controller
                name="all_day"
                control={control}
                render={({ field }) => (
                  <Checkbox checked={field.value} onChange={() => field.onChange(!field.value)} />
                )}
              />
            </FormItem>

            <FormItem
              label="Video Call URL"
              invalid={!!errors.videocall_url}
              errorMessage={errors.videocall_url?.message}
            >
              <Input
                type="url"
                placeholder="https://meet.example.com/meeting-id"
                {...register('videocall_url')}
              />
            </FormItem>

            <FormItem
              label="Description"
              invalid={!!errors.description}
              errorMessage={errors.description?.message}
            >
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Enter meeting description"
                rows={4}
                {...register('description')}
              />
            </FormItem>

            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="plain" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="solid" type="submit" loading={isPending} icon={<LuSave />}>
                Save Changes
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </Dialog>
  );
};

export default EditEventDetailsModal;
