import { Controller } from 'react-hook-form';
import Button from '@/components/ui/Button';
import { Form, FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface LeadEditFormProps {
  control: any;
  errors: any;
  isUpdatingLead: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

const LeadEditForm = ({
  control,
  errors,
  isUpdatingLead,
  onSubmit,
  onCancel,
}: LeadEditFormProps) => {
  return (
    <div className="rounded-lg bg-white md:p-4">
      <h3 className="mb-3">Edit Lead</h3>
      <Form onSubmit={onSubmit} containerClassName="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        <FormItem
          label="Contact Name"
          invalid={Boolean(errors?.contact_name)}
          errorMessage={errors?.contact_name?.message}
        >
          <Controller
            name="contact_name"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                {...field}
                placeholder="Enter contact name"
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </FormItem>

        <FormItem
          label="Email"
          invalid={Boolean(errors?.email_from)}
          errorMessage={errors?.email_from?.message}
        >
          <Controller
            name="email_from"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                {...field}
                placeholder="Enter email"
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </FormItem>

        <FormItem
          label="Phone"
          invalid={Boolean(errors?.phone)}
          errorMessage={errors?.phone?.message}
        >
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Enter phone"
                pattern="[+\d\s()-]*"
                onKeyDown={(e) => {
                  // Allow control keys like Backspace, Delete, Arrow keys, etc.
                  if (
                    e.key === 'Backspace' ||
                    e.key === 'Delete' ||
                    e.key === 'ArrowLeft' ||
                    e.key === 'ArrowRight' ||
                    e.key === 'Tab' ||
                    e.ctrlKey ||
                    e.metaKey
                  ) {
                    return;
                  }

                  const pattern = /[+\d\s()-]/;
                  if (!pattern.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </FormItem>

        <FormItem
          label="Expected Revenue"
          invalid={Boolean(errors?.expected_revenue)}
          errorMessage={errors?.expected_revenue?.message}
        >
          <Controller
            name="expected_revenue"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                {...field}
                placeholder="Enter expected revenue"
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />
        </FormItem>

        <div className="col-span-full flex justify-end gap-3">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="solid"
            icon={<ApolloIcon name="file" />}
            type="submit"
            loading={isUpdatingLead}
          >
            Save Changes
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default LeadEditForm;
