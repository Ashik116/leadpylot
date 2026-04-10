import BaseFormComponent from '@/components/shared/form/BaseFormComponent';
import { z } from 'zod';
import { FieldDefinition } from '@/components/shared/form/types';

interface ReclamationModalFormProps {
    isSubmitting: boolean;
    onSubmit: (data: any) => void;
    fields: FieldDefinition[];
    schema: z.ZodType;
}

const ReclamationModalForm = ({
    isSubmitting,
    onSubmit,
    fields,
    schema,
}: ReclamationModalFormProps) => {
    return (
        <div>
            <h3 className="mb-4 text-lg font-semibold">Submit Reclamation</h3>

            <BaseFormComponent
                schema={schema}
                fields={fields}
                onSubmit={onSubmit}
                handleSubmitInternally={true}
                actionButtons={{
                    className: 'flex justify-end',
                    submit: true,
                    reset: true,
                    text: 'Submit Reclamation',
                    loadingText: 'Submitting...',
                }}
                isLoading={isSubmitting}
                cardProps={{
                    bordered: false,
                    bodyClass: 'pt-0',
                }}
            />
        </div>
    );
};

export default ReclamationModalForm;

