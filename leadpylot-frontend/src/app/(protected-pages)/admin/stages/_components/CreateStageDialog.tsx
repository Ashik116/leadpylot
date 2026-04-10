import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Dialog from '@/components/ui/Dialog';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { useCreateStage } from '@/services/hooks/useStages';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

export const statusSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, 'Status name is required'),
  code: z.string(),
  allowed: z.boolean(),
});

export const stageSchema = z.object({
  name: z.string().min(1, 'Stage name is required'),
  isWonStage: z.boolean(),
  statuses: z.array(statusSchema).optional(),
});

export type StageFormData = z.infer<typeof stageSchema>;

interface CreateStageDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStageDialog({ isOpen, onClose }: CreateStageDialogProps) {
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
    },
  });

  const onSubmit = async (data: StageFormData) => {
    try {
      // Send data in the format expected by the backend
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
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to create stage:', error);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to create stage
        </Notification>
      );
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <h4 className="mb-4 text-lg font-semibold">Create New Stage</h4>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-row gap-2">
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
        </div>

        <div className="ml-2">
          <FormItem
            label="Is Won Stage"
            invalid={Boolean(errors?.isWonStage)}
            errorMessage={errors?.isWonStage?.message}
          >
            <Controller
              name="isWonStage"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Checkbox checked={value} onChange={(checked) => onChange(checked)} />
              )}
            />
          </FormItem>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" type="submit" loading={createStageMutation.isPending}>
            Create Stage
          </Button>
        </div>
      </Form>
    </Dialog>
  );
}
