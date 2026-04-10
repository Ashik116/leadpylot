'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import { TLead } from '@/services/LeadsService';
import { useCreateMeeting } from '@/services/hooks/meetings/useMeetings';
import { useLead } from '@/services/hooks/useLeads';
import useNotification from '@/utils/hooks/useNotification';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import ColorPicker from './ColorPicker';

interface AddMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: TLead | null;
  selectedDate?: Date;
  onAddMeeting: () => void;
}

interface MeetingFormData {
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  color: string;
  attendees: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

// Mock data for attendees
const mockUsers: User[] = [
  { id: '1', name: 'Administrator', role: 'Admin', avatar: 'A' },
  { id: '2', name: 'Albert Claus', role: 'Agent' },
  { id: '3', name: 'Abkhezr Mahmood', role: 'Agent' },
  { id: '4', name: 'Achim Dümichen', role: 'Agent' },
  { id: '5', name: 'Achim Schlosser', role: 'Agent' },
  { id: '6', name: 'Adam Sellers', role: 'Agent' },
  { id: '7', name: 'Adolf Sebastian', role: 'Agent' },
  { id: '8', name: 'Albant Mathis', role: 'Agent' },
  { id: '9', name: 'Albert Hochdörfer', role: 'Agent' },
];

const AddMeetingDialog = ({ isOpen, onClose, lead, selectedDate }: AddMeetingDialogProps) => {
  const { openNotification } = useNotification();
  const [videoCallUrl, setVideoCallUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const videoCallInputRef = useRef<HTMLInputElement>(null);
  const [isAttendeesDropdownOpen, setIsAttendeesDropdownOpen] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // get lead data
  const leadId = typeof lead?._id === 'number' ? String(lead._id) : lead?._id;
  const { data: leadData } = useLead(leadId || '');
  // Format date functions
  // Use dayjs for date formatting instead of custom functions
  const formatDateString = (date: Date) => {
    return dayjs(date).format('YYYY-MM-DD');
  };

  const formatTimeString = (date: Date) => {
    return dayjs(date).format('HH:mm');
  };

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAttendeesDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Use state to track form defaults and ensure they update with selectedDate
  const [formDefaults, setFormDefaults] = useState({
    title: lead ? `Meeting with ${lead.contact_name}` : 'New Meeting',
    description: '',
    location: 'Online',
    startDate: formatDateString(selectedDate || new Date()),
    startTime: formatTimeString(selectedDate || new Date()),
    endDate: formatDateString(selectedDate || new Date()),
    endTime: formatTimeString(new Date((selectedDate || new Date()).getTime() + 60 * 60 * 1000)),
    color: 'blue',
    attendees: lead?.contact_name || '',
  });

  // Update form defaults when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      // Calculate end time (1 hour after start)
      const endDate = new Date(selectedDate.getTime() + 60 * 60 * 1000);

      setFormDefaults({
        title: lead ? `Meeting with ${lead.contact_name}` : 'New Meeting',
        description: '',
        location: 'Online',
        startDate: formatDateString(selectedDate),
        startTime: formatTimeString(selectedDate),
        endDate: formatDateString(selectedDate),
        endTime: formatTimeString(endDate),
        color: 'blue',
        attendees: lead?.contact_name || '',
      });
    }
  }, [selectedDate, lead]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { isSubmitting },
    reset,
    watch,
  } = useForm<MeetingFormData>({
    defaultValues: formDefaults,
  });

  // Reset the form when defaults change
  useEffect(() => {
    reset(formDefaults);
  }, [formDefaults, reset]);

  // Initialize the first attendee
  useEffect(() => {
    if (lead) {
      // Always select Administrator by default - ignore any other automatic selections
      setSelectedAttendees([
        {
          id: String(lead._id ?? ''),
          name: lead?.project?.[0]?.agent?.login ?? 'Administrator',
          role: lead?.project?.[0]?.agent?.role ?? 'Agent',
        },
      ]);
    }
  }, [lead]); // Only run once on component mount

  // If lead changes, update the form title but don't auto-select lead as attendee
  useEffect(() => {
    if (lead) {
      setValue('title', `Meeting with ${lead.contact_name}`);
    }
  }, [lead, setValue]);

  // Update form attendees when selected attendees change
  useEffect(() => {
    const attendeeNames = selectedAttendees.map((a) => a.name).join(', ');
    setValue('attendees', attendeeNames);
  }, [selectedAttendees, setValue]);

  const selectedColor = watch('color');

  const handleColorSelect = (colorId: string) => {
    setValue('color', colorId);
  };

  const toggleAttendeesDropdown = () => {
    setIsAttendeesDropdownOpen(!isAttendeesDropdownOpen);
  };

  const handleAttendeeSelect = (user: User) => {
    // Check if the attendee is already selected
    if (!selectedAttendees.some((a) => a.id === user.id)) {
      setSelectedAttendees([...selectedAttendees, user]);
    }
  };

  const handleRemoveAttendee = (user: User) => {
    setSelectedAttendees(selectedAttendees.filter((a) => a.id !== user.id));
  };

  const filteredUsers = mockUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { mutateAsync: createMeeting } = useCreateMeeting();

  const onSubmit = async (data: MeetingFormData) => {
    // Parse dates and times
    const [startYear, startMonth, startDay] = data.startDate.split('-').map(Number);
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endYear, endMonth, endDay] = data.endDate.split('-').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);

    // Create Date objects (month is 0-indexed in JavaScript Date)
    const startDateTime = new Date(startYear, startMonth - 1, startDay, startHour, startMinute);
    const endDateTime = new Date(endYear, endMonth - 1, endDay, endHour, endMinute);

    // const newMeeting = {
    //   title: data.title,
    //   start: startDateTime,
    //   end: endDateTime,
    //   extendedProps: {
    //     description: data.description,
    //     location: data.location,
    //     eventColor: data.color,
    //     attendees: data.attendees.split(',').map((item) => item.trim()),
    //     leadId:
    //       lead && lead._id
    //         ? typeof lead._id === 'number'
    //           ? String(lead._id)
    //           : lead._id
    //         : undefined,
    //     leadName: lead?.contact_name,
    //     leadEmail: lead?.email_from,
    //     leadPhone: lead?.phone,
    //   },
    // };

    // Check if lead is available
    if (!lead || !lead._id) {
      openNotification({ type: 'danger', massage: 'Lead is required to create a meeting' });
      return;
    }

    try {
      // Create the meeting using the API and wait for completion
      await createMeeting({
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: false,
        agent_id: leadData?.project[0].agent._id ?? null,
        lead_id: typeof lead._id === 'number' ? String(lead._id) : lead._id,
        project_id: leadData?.project?.[0]?._id ?? '',
        videocall_url: videoCallUrl,
        description: data.description,
        bookedBy_id: leadData?.project[0].agent._id ?? null,
      });

      // Only call these after successful API call
      // onAddMeeting();
      onClose();
    } catch (error) {
      // Error is already handled by the useCreateMeeting hook
      console.error('Failed to create meeting:', error);
    }
  };
  // console.log('this is leads projects sajjad', lead?.projects);
  // Function to generate Odoo meeting link
  const generateOdooMeetingLink = () => {
    // Generate a unique meeting ID based on timestamp and random numbers
    const meetingId = `odoo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const meetingLink = `https://meet.odoo.com/${meetingId}`;

    setVideoCallUrl(meetingLink);

    // Focus on the input after setting the URL
    setTimeout(() => {
      if (videoCallInputRef.current) {
        videoCallInputRef.current.focus();
      }
    }, 100);

    openNotification({ type: 'success', massage: 'Meeting link generated' });
  };

  // Function to copy URL to clipboard
  const copyToClipboard = () => {
    if (videoCallUrl && navigator.clipboard) {
      navigator.clipboard
        .writeText(videoCallUrl)
        .then(() => {
          setIsCopied(true);
          openNotification({ type: 'success', massage: 'Link copied to clipboard' });

          // Reset the copied state after 2 seconds
          setTimeout(() => {
            setIsCopied(false);
          }, 2000);
        })
        .catch(() => {
          // Handle copy error silently
          openNotification({ type: 'danger', massage: 'Failed to copy link' });
        });
    }
  };

  useEffect(() => {
    if (selectedDate) {
      const endDate = new Date(selectedDate.getTime() + 60 * 60 * 1000);

      setValue('startDate', formatDateString(selectedDate));
      setValue('startTime', formatTimeString(selectedDate));
      setValue('endDate', formatDateString(selectedDate));
      setValue('endTime', formatTimeString(endDate));
    }
  }, [selectedDate, setValue]);

  useEffect(() => {
    if (lead) {
      setValue('title', `Meeting with ${lead.contact_name}`);
    }
  }, [lead, setValue]);

  useEffect(() => {
    const attendeeNames = selectedAttendees.map((a) => a.name).join(', ');
    setValue('attendees', attendeeNames);
  }, [selectedAttendees, setValue]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} closable={false} width={600}>
      <div className="max-h-[85vh] overflow-y-auto p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between md:mb-5">
          <h2 className="text-lg font-bold md:text-xl">Add Meeting</h2>
          <button
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <ApolloIcon name="cross" />
          </button>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)} layout="vertical">
          <FormItem label="Title" asterisk>
            <Input {...register('title')} placeholder="Meeting title" className="w-full" />
          </FormItem>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <FormItem label="Start Date" asterisk>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    placeholder="Select date"
                    value={field.value ? new Date(field.value) : null}
                    onChange={(date) => field.onChange(date ? formatDateString(date) : '')}
                    className="w-full"
                  />
                )}
              />
            </FormItem>
            <FormItem label="Start Time">
              <Controller
                name="startTime"
                control={control}
                render={({ field }) => (
                  <Input
                    type="time"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full"
                  />
                )}
              />
            </FormItem>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <FormItem label="End Date" asterisk>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    placeholder="Select date"
                    value={field.value ? new Date(field.value) : null}
                    onChange={(date) => field.onChange(date ? formatDateString(date) : '')}
                    className="w-full"
                  />
                )}
              />
            </FormItem>
            <FormItem label="End Time">
              <Controller
                name="endTime"
                control={control}
                render={({ field }) => (
                  <Input
                    type="time"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full"
                  />
                )}
              />
            </FormItem>
          </div>

          {lead && (
            <FormItem label="Attendees">
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedAttendees.map((attendee) => (
                  <Tag
                    key={attendee.id}
                    className="flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs md:px-3 md:text-sm"
                    prefix={
                      <Avatar size={16} shape="circle" className="mr-1 md:mr-2">
                        {attendee.avatar || attendee.name.charAt(0)}
                      </Avatar>
                    }
                    suffix={
                      <button
                        type="button"
                        className="ml-1 text-gray-500 hover:text-gray-700"
                        onClick={() => handleRemoveAttendee(attendee)}
                        aria-label={`Remove ${attendee.name}`}
                      >
                        <ApolloIcon name="cross" />
                      </button>
                    }
                  >
                    <span className="max-w-[100px] truncate md:max-w-[150px]">{attendee.name}</span>
                  </Tag>
                ))}
              </div>

              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Input
                    placeholder="Search attendees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={() => setIsAttendeesDropdownOpen(true)}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500"
                    onClick={toggleAttendeesDropdown}
                  >
                    <ApolloIcon name="chevron-arrow-down" className="text-2xl" />
                  </button>
                </div>

                {isAttendeesDropdownOpen && (
                  <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex cursor-pointer items-center border-b border-gray-100 px-2 py-2 hover:bg-gray-50 md:px-3"
                          onClick={() => handleAttendeeSelect(user)}
                        >
                          <Avatar size={20} shape="circle" className="mr-2">
                            {user.avatar || user.name.charAt(0)}
                          </Avatar>
                          <div className="overflow-hidden">
                            <div className="truncate text-xs font-medium md:text-sm">
                              {user.name}
                            </div>
                            <div className="truncate text-xs text-gray-500">{user.role}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-sm text-gray-500">No users found</div>
                    )}
                    <div className="border-t border-gray-100 p-2 text-center">
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => setIsAttendeesDropdownOpen(false)}
                      >
                        Search More...
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <input type="hidden" {...register('attendees')} />
            </FormItem>
          )}

          <FormItem label="Videocall URL">
            <div className="flex items-center">
              <Input
                ref={videoCallInputRef}
                value={videoCallUrl}
                onChange={(e) => setVideoCallUrl(e.target.value)}
                placeholder="Video call URL"
                className="w-full"
              />
              <Button
                variant="default"
                size="sm"
                className="ml-2 shrink-0 px-2 py-1 md:px-3 md:py-2"
                onClick={copyToClipboard}
                type="button"
                aria-label="Copy to clipboard"
              >
                {isCopied ? (
                  <ApolloIcon name="check" className="text-green-500" />
                ) : (
                  <ApolloIcon name="copy" />
                )}
              </Button>
            </div>
            <div className="mt-1">
              <Button
                variant="default"
                size="sm"
                type="button"
                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 md:text-sm"
                onClick={generateOdooMeetingLink}
              >
                <span className="mr-1">+</span> meeting
              </Button>
            </div>
          </FormItem>

          <FormItem label="Description">
            <Input
              textArea
              rows={3}
              {...register('description')}
              placeholder="Meeting details"
              className="w-full"
            />
          </FormItem>

          <FormItem label="Meeting color" asterisk>
            <ColorPicker selectedColor={selectedColor} onSelectColor={handleColorSelect} />
          </FormItem>

          <Button
            type="submit"
            variant="solid"
            size="lg"
            className="mt-4 w-full bg-blue-500 py-2 text-center text-white hover:bg-blue-600 hover:text-white"
            loading={isSubmitting}
          >
            Create Meeting
          </Button>
        </Form>
      </div>
    </Dialog>
  );
};

export default AddMeetingDialog;
