/* eslint-disable eqeqeq */
/* eslint-disable react-hooks/preserve-manual-memoization */
'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import ConfirmPopover from '@/components/shared/ConfirmPopover';
import {
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  CreateAppointmentData,
  UpdateAppointmentData,
} from '@/hooks/useAppointments';
import useNotification from '@/utils/hooks/useNotification';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAppointmentDialogStore } from '@/stores/appointmentDialogStore';
import { useLead } from '@/services/hooks/useLeads';
import { TimePicker } from '@/components/shared/form/TimePicker';

interface AppointmentFormData {
  appointment_date: string;
  appointment_time: string;
  title: string;
  description: string;
}

interface AppointmentDialogProps {
  /** When provided, renders form only (no Dialog) - for use inside dropdown */
  leadId?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

const convertApiTimeToPickerFormat = (apiTime: string): string => {
  if (!apiTime) return '';
  const parts = apiTime.split(':');
  if (parts.length >= 1) {
    const actualHour = parseInt(parts[0], 10);
    if (!isNaN(actualHour)) {
      const storageHour = actualHour === 24 ? 23 : actualHour - 1;
      return `${String(storageHour).padStart(2, '0')}:00:00`;
    }
  }
  return apiTime;
};

const formatTimeForApi = (time: string): string => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length >= 2) {
    const hourStorage = parseInt(parts[0], 10);
    if (!isNaN(hourStorage)) {
      const actualHour = hourStorage + 1;
      return `${String(actualHour).padStart(2, '0')}:${parts[1]}`;
    }
  }
  return time;
};

const AppointmentDialog = ({
  leadId: propLeadId,
  onSuccess: propOnSuccess,
  onClose: propOnClose,
}: AppointmentDialogProps) => {
  const { openNotification } = useNotification();
  const { mutateAsync: createAppointment, isPending: isCreating } = useCreateAppointment();
  const { mutateAsync: updateAppointment, isPending: isUpdating } = useUpdateAppointment();
  const { mutateAsync: deleteAppointment, isPending: isDeleting } = useDeleteAppointment();

  const {
    isOpen,
    mode,
    appointmentData,
    leadId: storeLeadId,
    selectedDate,
    closeDialog,
    onEditSuccess,
  } = useAppointmentDialogStore();

  const isFormOnly = propLeadId != null && propOnSuccess != null && propOnClose != null;
  const leadId = isFormOnly ? propLeadId : storeLeadId || '';
  const effectiveMode = isFormOnly ? 'create' : mode;
  const { data: lead } = useLead(leadId);

  const isPending = isCreating || isUpdating || isDeleting;
  const formatDateString = (date: Date) => dayjs(date).format('YYYY-MM-DD');

  const formDefaults = useMemo(() => {
    if (effectiveMode === 'edit' && appointmentData) {
      const rawDate = appointmentData.appointment_date;
      const appointmentDateStr = rawDate ? dayjs(rawDate).format('YYYY-MM-DD') : '';
      return {
        appointment_date: appointmentDateStr,
        appointment_time: convertApiTimeToPickerFormat(appointmentData.appointment_time || ''),
        title: appointmentData.title || '',
        description: appointmentData?.description || appointmentData?.notes || '',
      };
    }
    const defaultDate = isFormOnly ? new Date() : selectedDate || new Date();
    const currentHour = new Date().getHours();
    return {
      appointment_date: formatDateString(defaultDate),
      appointment_time: `${String(currentHour).padStart(2, '0')}:00:00`,
      title: lead ? `Appointment with ${lead.contact_name}` : 'New Appointment',
      description: '',
    };
  }, [effectiveMode, appointmentData, selectedDate, lead]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { isSubmitting },
    reset,
  } = useForm<AppointmentFormData>({
    defaultValues: formDefaults,
  });

  useEffect(() => {
    reset(formDefaults);
  }, [formDefaults, reset]);

  useEffect(() => {
    if (lead && effectiveMode === 'create') {
      setValue('title', `Appointment with ${lead.contact_name}`);
    }
  }, [lead, effectiveMode, setValue]);

  const handleSuccess = () => {
    if (effectiveMode === 'edit') {
      onEditSuccess?.();
    }
    isFormOnly ? propOnSuccess!() : closeDialog();
  };
  const handleClose = () => (isFormOnly ? propOnClose!() : closeDialog());

  const onSubmit = async (data: AppointmentFormData) => {
    if (effectiveMode === 'create' && (!lead || !lead._id)) {
      openNotification({ type: 'danger', massage: 'Lead is required to create an appointment' });
      return;
    }
    if (effectiveMode === 'edit' && (!appointmentData || !appointmentData._id)) {
      openNotification({ type: 'danger', massage: 'Appointment data is missing' });
      return;
    }

    try {
      if (effectiveMode === 'create') {
        const createData: CreateAppointmentData = {
          lead_id: typeof lead?._id === 'number' ? String(lead?._id) : lead?._id || '',
          appointment_date: data.appointment_date,
          title: data.title,
          description: data.description,
          appointment_time: formatTimeForApi(data.appointment_time),
          location: 'Office',
        };
        await createAppointment(createData);
        openNotification({ type: 'success', massage: 'Appointment created successfully' });
      } else if (effectiveMode === 'edit' && appointmentData) {
        const updateData: UpdateAppointmentData = {
          appointment_date: data.appointment_date,
          appointment_time: formatTimeForApi(data.appointment_time),
          title: data.title,
          description: data.description,
          notes: data.description,
        };
        await updateAppointment({
          id:
            typeof appointmentData._id === 'string'
              ? appointmentData._id
              : String(appointmentData._id),
          data: updateData,
        });
        openNotification({ type: 'success', massage: 'Appointment updated successfully' });
      }
      handleSuccess();
    } catch {
      openNotification({
        type: 'danger',
        massage: `Failed to ${effectiveMode === 'create' ? 'create' : 'update'} appointment`,
      });
    }
  };

  const handleDeleteAppointment = async () => {
    if (!appointmentData) return;
    try {
      await deleteAppointment(appointmentData._id);
      openNotification({ type: 'success', massage: 'Appointment deleted successfully' });
      handleSuccess();
    } catch {
      openNotification({ type: 'danger', massage: 'Failed to delete appointment' });
    }
  };

  const formContent = (
    <div className={isFormOnly ? 'flex flex-col p-3' : ''}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold md:text-xl">
          {effectiveMode === 'create' ? 'Create Meeting' : 'Edit Meeting'}
        </h2>
        <div className="flex items-center gap-2">
          {effectiveMode === 'edit' && (
            <ConfirmPopover
              title="Delete appointment"
              description="Are you sure you want to delete this appointment? This cannot be undone."
              confirmText="Delete"
              onConfirm={handleDeleteAppointment}
              isLoading={isDeleting}
              placement="bottom"
              floatingClassName="!z-[100003]"
            >
              <Button
                size="xs"
                variant="plain"
                disabled={isPending}
                className="rounded-md p-1 text-red-500 transition-colors hover:!bg-red-50 hover:!text-red-600"
                title="Delete appointment"
                icon={<ApolloIcon name="trash" />}
              />
            </ConfirmPopover>
          )}
          <Button
            size="xs"
            variant="plain"
            className="rounded-md p-1 text-gray-500 transition-colors hover:!bg-gray-100 hover:!text-gray-700"
            onClick={handleClose}
            aria-label="Close"
            icon={<ApolloIcon name="cross" />}
          />
        </div>
      </div>

      <Form onSubmit={handleSubmit(onSubmit)} layout="vertical">
        <FormItem label="Date" asterisk>
          <Controller
            name="appointment_date"
            control={control}
            rules={{ required: 'Appointment date is required' }}
            render={({ field }) => (
              <div className="relative [&_.picker]:z-[100]" style={{ overflow: 'visible' }}>
                <DatePicker
                  placeholder="Select date"
                  value={field.value ? new Date(field.value) : null}
                  onChange={(date) => field.onChange(date ? formatDateString(date) : '')}
                  className="w-full"
                  minDate={new Date()}
                />
              </div>
            )}
          />
        </FormItem>
        <FormItem label="Time (Hour)" asterisk className="mt-2">
          <Controller
            name="appointment_time"
            control={control}
            rules={{ required: 'Appointment time is required' }}
            render={({ field }) => (
              <TimePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select hour"
                format="24"
                precision="hour"
                closeOnSelect
              />
            )}
          />
        </FormItem>
        <div className="mt-2">
          <FormItem label="Notes">
            <Input
              textArea
              rows={4}
              {...register('description')}
              placeholder="Details and notes"
              className="w-full"
            />
          </FormItem>
        </div>
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" loading={isSubmitting || isPending}>
            {effectiveMode === 'create' ? 'Create Meeting' : 'Update'}
          </Button>
        </div>
      </Form>
    </div>
  );

  if (isFormOnly) return formContent;
  if (!storeLeadId) return null;

  return (
    <Dialog isOpen={isOpen} onClose={closeDialog} closable={false} width={500}>
      {formContent}
    </Dialog>
  );
};

export default AppointmentDialog;
