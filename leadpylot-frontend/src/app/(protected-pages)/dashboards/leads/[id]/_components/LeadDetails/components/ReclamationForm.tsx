import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import classNames from '@/utils/classNames';

interface ReclamationFormProps {
  modalView?: boolean;
  reclamationReason: string;
  isSubmitting: boolean;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const ReclamationForm = ({
  modalView,
  reclamationReason,
  isSubmitting,
  onReasonChange,
  onSubmit,
  onCancel,
}: ReclamationFormProps) => {
  return (
    <Card bordered={!modalView} className={classNames(modalView && 'shadow-none')} bodyClass="pt-2">
      <h3 className="mb-3">Submit Reclamation</h3>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <FormItem label="Reason for Reclamation" className="mb-0">
            <Input
              value={reclamationReason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Enter the reason for reclamation"
            />
          </FormItem>
        </div>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          loading={isSubmitting}
          variant="solid"
          onClick={onSubmit}
          disabled={!reclamationReason?.trim()}
        >
          Submit Reclamation
        </Button>
      </div>
    </Card>
  );
};

export default ReclamationForm;
