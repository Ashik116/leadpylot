import { useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useSubmitOffer, useUpdateOffer } from '@/services/hooks/useLeads';
import { parseKNumber } from '@/utils/utils';
import { FieldDefinition, FieldType } from '@/components/shared/form/types';
import {
  GET_ALL_BANKS_BY_PROJECT_ID_URL,
  GET_ALL_BONOUS_AMOUNTS_URL,
  GET_ALL_PAYMENT_TERMS_URL,
} from '@/constants/api.constant';

// Define the schema for the offer form
const offerSchema = z.object({
  nametitle: z
    .string({
      message: 'Name title is required',
    })
    .optional(),
  investment_volume: z
    .number({
      message: 'Investment Amount is required',
    })
    .min(0, 'Investment Amount must be a positive number'),
  interest_rate: z
    .number({
      message: 'rate is required',
    })
    .min(0, 'rate must be a positive number'),
  bank_id: z
    .string({
      message: 'Bank is required',
    })
    .min(1, 'Bank is required'),
  payment_terms: z
    .string({
      message: 'Payment terms are required',
    })
    .min(1, 'Payment terms are required'),
  bonus_amount: z
    .string({
      message: 'Bonus amount is required',
    })
    .min(1, 'Bonus amount is required'),
  offerType: z
    .string({
      message: 'Offer type is required',
    })
    .min(1, 'Offer type is required'),
  reference_no: z.string().optional(),
  flex_option: z.boolean({
    message: 'Flex option is required',
  }),
  // New scheduling and handover fields
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  selected_agent_id: z.string().optional(),
  notes: z.string().nullable().optional(),
  load_and_opening: z.enum(['load', 'opening']).optional(),
});

export type OfferFormData = z.infer<typeof offerSchema>;

interface UseOfferFormProps {
  projectId: string;
  leadId: string;
  agentId: string;
  lead?: any; // Lead data to set default values
  isEditMode?: boolean;
  existingOffer?: any; // Existing offer data for editing
  onClose?: () => void; // Callback to close modal after successful update
}

export const useOfferForm = ({
  projectId,
  leadId,
  agentId,
  lead,
  isEditMode = false,
  existingOffer,
  onClose,
}: UseOfferFormProps) => {
  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);
  const [twentyFourHoursAgo] = useState(() => new Date(Date.now() - 1000 * 60 * 60 * 24));
  // Check if offers exist and the first offer was created more than 24 hours ago
  const isLoadOrMoreVisible = useMemo(() => {
    if (!lead?.offers || lead.offers.length === 0) {
      return false;
    }
    const firstOffer = lead.offers?.[0];
    if (!firstOffer?.created_at) {
      return false;
    }
    const offerCreatedAt = new Date(firstOffer.created_at);
    // Compute the "24 hours ago" value at the time of memoization

    return offerCreatedAt < twentyFourHoursAgo;
  }, [lead?.offers, twentyFourHoursAgo]);

  // Show load_and_opening field if:
  // 1. The 24-hour condition is met (isLoadOrMoreVisible), OR
  // 2. In edit mode and the existing offer has a load_and_opening value
  const shouldShowLoadAndOpening = useMemo(() => {
    if (isLoadOrMoreVisible) {
      return true;
    }
    if (isEditMode && existingOffer?.load_and_opening) {
      return true;
    }
    return false;
  }, [isLoadOrMoreVisible, isEditMode, existingOffer?.load_and_opening]);

  const safeParseNumber = useCallback((val: any) => {
    const parsed = parseKNumber(val);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  const getDefaultValues = useCallback(() => {
    if (isEditMode && existingOffer) {
      // Return existing offer values for editing
      return {
        nametitle: existingOffer?.nametitle || '',
        investment_volume: Number(safeParseNumber(existingOffer?.investment_volume).toFixed(2)),
        interest_rate: Number(safeParseNumber(existingOffer?.interest_rate).toFixed(2)),
        bank_id: existingOffer?.bank_id?._id || existingOffer?.bank?._id || '',
        payment_terms: existingOffer?.payment_terms?._id || existingOffer?.payment_terms || '',
        bonus_amount: existingOffer?.bonus_amount?._id || existingOffer?.bonus_amount || '',
        offerType: existingOffer?.offerType || '',
        reference_no: existingOffer?.reference_no || '',
        flex_option: existingOffer?.flex_option || false,
        notes: existingOffer?.notes || '',
        ...(existingOffer?.load_and_opening !== undefined &&
        existingOffer?.load_and_opening !== null
          ? { load_and_opening: existingOffer?.load_and_opening }
          : {}),
      } as Partial<OfferFormData>;
    }

    // Return default values for new offers
    let defaultInvestmentVolume = 0;
    if (lead?.expected_revenue) {
      const parsedValue = parseKNumber(lead?.expected_revenue.toString());
      defaultInvestmentVolume = isNaN(parsedValue) ? 0 : parsedValue;
    }

    return {
      investment_volume: defaultInvestmentVolume,
    } as Partial<OfferFormData>;
  }, [isEditMode, existingOffer, lead]);

  // Memoize default values so toggling UI (e.g., notes button) doesn't reset the form
  const memoizedDefaultValues = useMemo(() => getDefaultValues(), [getDefaultValues]);

  const submitOfferMutation = useSubmitOffer({
    onSuccess: () => {
      setTimeout(() => {
        setIsAddOfferOpen(false);
        // Reset form key when submission is successful
      }, 200);
    },
  });

  const updateOfferMutation = useUpdateOffer({
    onSuccess: () => {
      setTimeout(() => {
        setIsAddOfferOpen(false);
        // Reset form key when update is successful
      }, 200);
      onClose?.(); // Call onClose callback if provided
    },
  });

  const onSubmit = (data: OfferFormData) => {
    if (isEditMode && existingOffer) {
      // Update existing offer - only include fields allowed by UpdateOfferRequest
      updateOfferMutation.mutate({
        id: existingOffer?._id,
        data: {
          investment_volume: data?.investment_volume,
          interest_rate: data?.interest_rate,
          payment_terms: data?.payment_terms,
          bonus_amount: data?.bonus_amount,
          bank_id: data?.bank_id,
          offerType: data?.offerType,
          flex_option: data?.flex_option,
          nametitle: data?.nametitle,
          reference_no: data?.reference_no,
          notes: data.notes || '',
          load_and_opening: data?.load_and_opening || undefined,
          //   scheduled_date: data?.scheduled_date || undefined,
          //   scheduled_time: data?.scheduled_time || undefined,
          //   selected_agent_id: data?.selected_agent_id || undefined,
        },
      });
    } else {
      // Submit new offer - exclude scheduled_date, scheduled_time, and selected_agent_id

      const { ...offerData } = data;
      submitOfferMutation.mutate({
        ...offerData,
        bank_id: data?.bank_id || '',
        project_id: projectId,
        lead_id: leadId,
        agent_id: agentId,
        offerType: data?.offerType,
        nametitle: data?.nametitle || '',
        reference_no: data?.reference_no,
        notes: data?.notes || undefined,
        load_and_opening: data?.load_and_opening || undefined,
      });
    }
  };

  // Create a wrapper function for BaseFormComponent
  const handleFormSubmit = (data: any) => {
    onSubmit(data as OfferFormData);
  };

  const handleAddOfferClick = () => {
    setIsAddOfferOpen(!isAddOfferOpen);
  };

  const cancelOffer = () => {
    setIsAddOfferOpen(false);
    onClose?.();
    // Increment reset key to force form reset when closing
  };

  // Field definitions for BaseFormComponent
  const getFormFields = useCallback(
    (): FieldDefinition[] => [
      {
        name: 'nametitle',
        label: 'Title',
        type: 'select',
        placeholder: 'Select title',
        className: 'col-span-12 md:col-span-6 lg:col-span-4',
        options: [
          { label: 'Herr', value: 'Herr' },
          { label: 'Frau', value: 'Frau' },
          { label: 'Famillie', value: 'Famillie' },
        ],
      },
      {
        name: 'offerType',
        label: 'Offer Type',
        type: 'select',
        placeholder: 'Select offer type',
        className: 'col-span-12 md:col-span-6 lg:col-span-4',
        options: [
          { label: 'Festgeld', value: 'Festgeld' },
          { label: 'Tagesgeld', value: 'Tagesgeld' },
          { label: 'ETF', value: 'ETF' },
        ],
      },
      {
        name: 'reference_no',
        label: 'Reference Number',
        step: '0.01',
        type: 'input',
        inputType: 'text',
        placeholder: 'Enter reference no',
        className: 'col-span-12 md:col-span-6 lg:col-span-4',
      },
      {
        name: 'investment_volume',
        label: 'Investment Amount',
        type: 'input',
        inputType: 'number',
        step: '0.01',
        placeholder: 'Enter investment Amount',
        className: 'col-span-12 md:col-span-6 lg:col-span-4',
      },
      {
        name: 'interest_rate',
        label: 'Rate',
        type: 'input',
        inputType: 'number',
        step: '0.01',
        placeholder: 'Enter  rate',
        className: 'col-span-12 md:col-span-6 lg:col-span-4',
      },
      {
        name: 'bank_id',
        label: 'Bank',
        type: 'asyncSelectSingle',
        placeholder: 'Select bank',
        className: 'col-span-12 md:col-span-6 lg:col-span-4',
        apiUrl: `${GET_ALL_BANKS_BY_PROJECT_ID_URL}/${projectId}`,
        queryKey: `project-banks-${projectId}`,
        optLabelKey: 'name',
        optValueKey: '_id',
      },
      {
        name: 'payment_terms',
        label: 'Payment Terms',
        type: 'asyncSelectSingle',
        placeholder: 'Select payment terms',
        className: 'col-span-12 md:col-span-6 lg:col-span-4',
        apiUrl: GET_ALL_PAYMENT_TERMS_URL,
        queryKey: 'payment-terms',
        optLabelKey: 'name',
        optValueKey: '_id',
      },
      {
        name: 'bonus_amount',
        label: 'Bonus Amount',
        type: 'asyncSelectSingle',
        placeholder: 'Select bonus amount',
        className: 'col-span-12 md:col-span-6 lg:col-span-4',
        apiUrl: GET_ALL_BONOUS_AMOUNTS_URL,
        queryKey: 'bonus-amounts',
        optLabelKey: 'name',
        optValueKey: '_id',
      },
      {
        name: 'flex_option',
        label: 'Flex Option',
        type: 'select',
        placeholder: 'Select flex option',
        className: 'col-span-12 md:col-span-6 lg:col-span-4',
        options: [
          { label: 'True', value: true },
          { label: 'False', value: false },
        ],
      },
      // Load field - visible if:
      // 1. Offers exist and were created more than 24 hours ago, OR
      // 2. In edit mode and the existing offer has a load_and_opening value
      ...(shouldShowLoadAndOpening
        ? [
            {
              name: 'load_and_opening',
              label: 'O/L (Opening or Load)',
              type: 'select' as FieldType,
              placeholder: 'Select load and opening',
              className: 'col-span-12 md:col-span-6 lg:col-span-4',
              options: [
                { label: 'Opening', value: 'opening' },
                { label: 'Load', value: 'load' },
              ],
            } satisfies FieldDefinition,
          ]
        : []),
      // New scheduling fields
      //   {
      //     name: 'scheduled_date',
      //     label: 'Scheduled Date',
      //     type: 'datepicker',
      //     placeholder: 'Select date (defaults to 48h from now)',
      //     className: 'col-span-12 md:col-span-6 lg:col-span-4',
      //   },
      //   {
      //     name: 'scheduled_time',
      //     label: 'Scheduled Time',
      //     type: 'timepicker',
      //     placeholder: '--:-- --',
      //     className: 'col-span-12 md:col-span-6 lg:col-span-4',
      //     // 24-hour time format
      //     timeFormat: '24',
      //     timePrecision: 'hourMinute',
      //     timeDisplayFormat: 'HH:MM',
      //   },
      //   // Agent handover field
      //   {
      //     name: 'selected_agent_id',
      //     label: 'Assign to Agent (⚠️ Transfer Warning)',
      //     type: 'select',
      //     placeholder: 'Select agent',
      //     className: 'col-span-12 md:col-span-6 lg:col-span-4',
      //     options: [
      //       !isAdmin
      //         ? {
      //             label: `${session?.user?.name || 'Me'} (Keep Lead)`,
      //             value: session?.user?.id || agentId,
      //           }
      //         : {},
      //       ...projectAgents,
      //     ],
      //   },

      {
        name: 'notes',
        label: 'Notes (Optional)',
        type: 'textarea' as FieldType,
        placeholder: 'Add notes about this offer or handover',
        className: 'col-span-12',
      },
    ],
    [projectId, shouldShowLoadAndOpening]
  );

  // Memoize fields to keep a stable reference unless relevant inputs change
  const memoizedFields = useMemo(() => getFormFields(), [getFormFields]);

  return {
    isAddOfferOpen,
    setIsAddOfferOpen,
    handleFormSubmit,
    isSubmitting: submitOfferMutation.isPending || updateOfferMutation.isPending,
    handleAddOfferClick,
    cancelOffer,
    fields: memoizedFields,
    defaultValues: memoizedDefaultValues,
    schema: offerSchema,
  };
};
