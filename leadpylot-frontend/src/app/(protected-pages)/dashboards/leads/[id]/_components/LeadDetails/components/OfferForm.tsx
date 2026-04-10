import BaseFormComponent from '@/components/shared/form/BaseFormComponent';
import { FieldDefinition } from '@/components/shared/form/types';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { z } from 'zod';

export type TLeadInfo = {
  contract_name: string;
  leadPrice?: string;
  existingOffer?: number;
  stage: string;
  lead_source_no: string;
};
interface OfferFormProps {
  modalView?: boolean;
  control?: any;
  errors?: any;
  isSubmitting: boolean;
  projectId?: string;
  onSubmit: (data: any) => void;
  isEditMode?: boolean;
  title?: string;
  showReferenceNumber?: boolean;
  flex_option?: boolean;
  fields: FieldDefinition[];
  defaultValues?: any;
  schema: z.ZodType;
  existingOffer?: any;
  leadInfo?: TLeadInfo;
  formResetKey?: number;
  entityName?: string;
}

const generateTitle = (title: string, leadInfo: TLeadInfo) => {
  if (!leadInfo) return <h3 className="text-lg font-semibold text-gray-900">{title}</h3>;
  return (
    <div className="mb-2 flex items-start justify-between gap-3 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-green-50 p-2">
          <ApolloIcon name="file" className="text-evergreen" />
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">
            for <span className="font-medium text-gray-700">{leadInfo?.contract_name}</span>
            <span className="mx-2 text-gray-300">•</span>
            partner Id:{' '}
            <span className="rounded bg-gray-100 px-1 py-0.5 text-gray-700">
              {leadInfo?.lead_source_no}
            </span>
            {leadInfo?.existingOffer && leadInfo?.existingOffer > 0 ? (
              <>
                <span className="mx-2 text-gray-300">•</span>
                <span>
                  total offers:{' '}
                  <span className="rounded bg-gray-100 px-1 py-0.5 text-gray-700">
                    {leadInfo?.existingOffer}
                  </span>
                </span>
              </>
            ) : (
              ''
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

const OfferForm = ({
  isSubmitting,
  onSubmit,
  isEditMode = false,
  title,
  fields,
  defaultValues,
  schema,
  leadInfo,
  entityName = 'Offer',
}: OfferFormProps) => {
  return (
    <div>
      {generateTitle(title ?? '', leadInfo as TLeadInfo)}

      <BaseFormComponent
        schema={schema}
        fields={isEditMode ? fields : fields?.filter((field) => field?.name !== 'reference_no')}
        onSubmit={onSubmit}
        handleSubmitInternally={true}
        actionButtons={{
          className: 'flex justify-end',
          submit: true,
          reset: true,
          text: isEditMode ? `Update ${entityName}` : `Create ${entityName}`,
          loadingText: isEditMode ? 'Updating...' : 'Saving...',
        }}
        isLoading={isSubmitting}
        defaultValues={defaultValues}
      />
    </div>
  );
};

export default OfferForm;
