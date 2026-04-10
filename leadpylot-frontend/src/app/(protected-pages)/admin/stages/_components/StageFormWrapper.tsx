import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { useCreateStage } from '@/services/hooks/useStages';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { stageSchema, type StageFormData } from './CreateStageDialog';

interface StageFormWrapperProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export function StageFormWrapper({ onSuccess, onClose }: StageFormWrapperProps) {
  const createStageMutation = useCreateStage();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: '',
      isWonStage: false,
      statuses: [],
    },
  });

  const onSubmit = async (data: StageFormData) => {
    try {
      const formattedData = {
        name: data.name,
        isWonStage: data.isWonStage,
        statuses: data.statuses || [],
      };

      await createStageMutation.mutateAsync(formattedData);
      toast.push(
        <Notification title="Stage created" type="success">
          Stage created successfully
        </Notification>
      );

      if (onSuccess) {
        onSuccess();
      }

      reset();
    } catch (error) {
      console.error('Failed to create stage:', error);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to create stage
        </Notification>
      );
    }
  };

  const isLoading = createStageMutation.isPending;

  return (
    <div className="w-full">
      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormItem
            label="Stage Name"
            invalid={Boolean(errors?.name)}
            errorMessage={errors.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field }) => <Input {...field} placeholder="Enter stage name" />}
            />
          </FormItem>

          <FormItem
            label="Is Won Stage"
            invalid={Boolean(errors?.isWonStage)}
            errorMessage={errors?.isWonStage?.message}
          >
            <Controller
              name="isWonStage"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox checked={value} onChange={(checked) => onChange(checked)} />
                  <span className="text-sm text-gray-600">Mark this stage as a winning stage</span>
                </div>
              )}
            />
          </FormItem>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Close
          </Button>
          <Button variant="solid" type="submit" loading={isLoading}>
            Create Stage
          </Button>
        </div>
      </Form>
    </div>
  );
}
