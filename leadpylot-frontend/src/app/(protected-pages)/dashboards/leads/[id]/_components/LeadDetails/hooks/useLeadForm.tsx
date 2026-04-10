import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateLead } from '@/services/hooks/useLeads';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { TLead } from '@/services/LeadsService';

// Define the schema for the lead form
const leadSchema = z.object({
  contact_name: z.string(),
  email_from: z.string().email().or(z.literal('')),
  phone: z
    .string()
    .max(15, 'Phone number must be less than 15 characters')
    .regex(/^[+\d\s()-]*$/, 'Phone number can only contain numbers, spaces, +, (, ), and -'),
  expected_revenue: z.number(),
  checked: z.boolean(),
});

export type LeadFormData = z.infer<typeof leadSchema>;

interface UseLeadFormProps {
  lead: TLead;
}

// Helper function to parse revenue string
const parseRevenueValue = (value: any): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (!value || typeof value !== 'string') {
    return 0;
  }

  // Remove any whitespace and convert to lowercase
  const cleaned = value.toString().trim().toLowerCase();

  // If it's already a plain number, parse it directly
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }

  // Handle formatted strings like "6.78k", "1.2m", etc.
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([kmb]?)$/);
  if (!match) {
    return 0; // Return 0 for invalid formats
  }

  const [, numberPart, suffix] = match;
  const baseNumber = parseFloat(numberPart);

  if (isNaN(baseNumber)) {
    return 0;
  }

  // Apply multiplier based on suffix
  switch (suffix) {
    case 'k':
      return baseNumber * 1000;
    case 'm':
      return baseNumber * 1000000;
    case 'b':
      return baseNumber * 1000000000;
    default:
      return baseNumber;
  }
};

export const useLeadForm = ({ lead }: UseLeadFormProps) => {
  const [isEditing, setIsEditing] = useState(false);

  // Memoize form values to prevent infinite re-renders
  const formValues = useMemo(
    () => ({
      checked: lead?.checked || false,
      expected_revenue: parseRevenueValue(lead?.expected_revenue),
      contact_name: lead?.contact_name || '',
      email_from: lead?.email_from || '',
      phone: lead?.phone || '',
    }),
    [lead?.checked, lead?.expected_revenue, lead?.contact_name, lead?.email_from, lead?.phone]
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: formValues,
  });

  // Reset form values when lead data changes
  useEffect(() => {
    if (!isEditing) {
      reset(formValues);
    }
  }, [formValues, reset, isEditing]);

  const { mutate: updateLead, isPending: isUpdatingLead } = useUpdateLead(String(lead?._id));

  const onSubmit = (data: LeadFormData) => {
    updateLead(
      {
        ...data,
        expected_revenue: +data?.expected_revenue,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.push(
            <Notification title="Lead updated" type="success">
              Lead updated successfully
            </Notification>
          );
        },
      }
    );
  };

  const handleEditClick = () => {
    if (isEditing) reset();
    setIsEditing(!isEditing);
  };

  const cancelEdit = () => {
    reset();
    setIsEditing(false);
  };

  return {
    isEditing,
    setIsEditing,
    control,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    isUpdatingLead,
    handleEditClick,
    cancelEdit,
  };
};
