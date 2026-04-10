import Card from '@/components/ui/Card'
import { CardProps } from '@/components/ui/Card';
import { Form } from '@/components/ui/Form';
import Button from '@/components/ui/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useEffect, useState } from 'react';
import { useForm, DefaultValues, FieldValues } from 'react-hook-form';
import { z } from 'zod';
import FormField from './FormField';
import { FieldDefinition } from './types';
import classNames from '@/utils/classNames';
import useNotification from '@/utils/hooks/useNotification';

export interface FormState<T> {
  values: T;
  isDirty: boolean;
  isValid: boolean;
}

interface ExtendedCardProps extends Omit<CardProps, 'title'> {
  title?: React.ReactNode;
  extra?: React.ReactNode;
}

interface BaseFormComponentProps<T extends z.ZodType> {
  schema: T;
  fields: FieldDefinition[];
  onSubmit?: (data: z.infer<T>) => void;
  onChange?: (state: FormState<z.infer<T>>) => void;
  onFormMethodsReady?: (methods: {
    setValue: (name: string, value: any, options?: any) => void;
    getValues: (name?: string) => any;
    control: any;
    register: any;
    errors: any;
    reset?: (values?: any, options?: any) => void;
  }) => void;
  className?: string;
  cardProps?: ExtendedCardProps;
  formProps?: {
    gridClassName?: string;
    disabled?: boolean;
  };
  actionButtons?: {
    submit?: boolean;
    reset?: boolean;
    text?: string;
    loadingText?: string;
    icon?: React.ReactNode;
    className?: string;
  };
  isLoading?: boolean;
  defaultValues?: DefaultValues<z.infer<T>>;
  beforeSubmit?: (data: z.infer<T>) => z.infer<T> | false | Promise<z.infer<T> | false>;
  afterSubmit?: (data: z.infer<T>, result?: any) => void;
  toastConfig?: {
    showSuccessToast?: boolean;
    successTitle?: string;
    successMessage?: string;
    showErrorToast?: boolean;
    errorTitle?: string;
    errorMessage?: string;
  };
  handleSubmitInternally?: boolean;
}

const BaseFormComponent = <T extends z.ZodType>({
  schema,
  fields,
  onSubmit,
  onChange,
  onFormMethodsReady,
  className = '',
  cardProps,
  formProps,
  actionButtons = { submit: true },
  isLoading = false,
  defaultValues,
  beforeSubmit,
  afterSubmit,
  toastConfig = {
    showSuccessToast: false,
    successTitle: 'Success',
    successMessage: 'Operation completed successfully',
    showErrorToast: false,
    errorTitle: 'Error',
    errorMessage: 'An error occurred',
  },
  handleSubmitInternally = false,
}: BaseFormComponentProps<T>) => {
  const { openNotification } = useNotification();
  const [internalLoading, setInternalLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0); // Add reset key state
  const loading = isLoading || internalLoading;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty, isValid },
    watch,
    reset,
    setValue: setFormValue,
    getValues: getFormValues,
  } = useForm<FieldValues>({
    resolver: zodResolver(schema as any),
    mode: 'onChange',
    defaultValues,
  });

  // Reset form when defaultValues change (but don't increment resetKey to avoid breaking scroll listeners)
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues, { keepDefaultValues: true });
    }
  }, [defaultValues, reset]);

  // Watch all fields
  const watchAllFields = watch();

  // Expose form methods to parent component
  useEffect(() => {
    if (onFormMethodsReady) {
      onFormMethodsReady({
        setValue: setFormValue as (name: string, value: any, options?: any) => void,
        getValues: getFormValues,
        control,
        register,
        errors,
        reset,
      });
    }
  }, [onFormMethodsReady, setFormValue, getFormValues, control, register, errors, reset]);

  // Call onChange when form values change
  useEffect(() => {
    if (onChange) {
      onChange({
        values: watchAllFields as z.infer<T>,
        isDirty,
        isValid,
      });
    }
  }, [onChange, watchAllFields, isDirty, isValid]);

  // Handle form submission
  const handleFormSubmit = async (data: z.infer<T>) => {
    try {
      setInternalLoading(true);
      // Execute beforeSubmit if provided
      if (beforeSubmit) {
        const modifiedData = await beforeSubmit(data);
        if (modifiedData === false) {
          setInternalLoading(false);
          return; // Cancel submission
        }
        data = modifiedData || data;
      }

      // Execute onSubmit if provided
      if (onSubmit) {
        if (handleSubmitInternally) {
          setInternalLoading(true);
          try {
            const result = await Promise.resolve(onSubmit(data));

            // Show success toast if configured
            if (toastConfig.showSuccessToast) {
              openNotification({
                type: 'success',
                massage: toastConfig.successMessage,
              });
            }

            // Execute afterSubmit callback if provided
            if (afterSubmit) {
              afterSubmit(data, result);
            }
          } catch (error) {
            // Show error toast if configured
            if (toastConfig.showErrorToast) {
              openNotification({
                type: 'danger',
                massage: error instanceof Error ? error.message : toastConfig.errorMessage,
              });
            }
            console.error('Form submission error:', error);
          } finally {
            setInternalLoading(false);
          }
        } else {
          // Just call onSubmit without handling loading/toasts internally
          // This is for external form handling
          await Promise.resolve(onSubmit(data));
        }
      } else if (handleSubmitInternally && afterSubmit) {
        // If no onSubmit but afterSubmit is provided
        afterSubmit(data, reset);
      }
    } catch (error) {
      console.error('Form processing error:', error);

      // Show error toast if configured
      if (toastConfig.showErrorToast) {
        openNotification({
          type: 'danger',
          massage: error instanceof Error ? error.message : toastConfig.errorMessage,
        });
      }
    } finally {
      setInternalLoading(false);
      // Only reset form if handleSubmitInternally is true (internal form handling)
      // For external form handling (handleSubmitInternally=false), let the parent decide
      if (handleSubmitInternally) {
        setResetKey((prev) => prev + 1);
        reset();
      }
    }
  };

  const renderFields = useMemo(
    () =>
      fields
        .filter((field) => {
          // Check if field has a condition and evaluate it
          if (field.condition) {
            return field.condition(watchAllFields);
          }
          return true;
        })
        .map((field) => (
          <div key={field.name} className={field.className || 'col-span-12'}>
            <FormField
              field={field}
              register={register}
              control={control}
              errors={errors}
              isLoading={loading}
              resetKey={resetKey}
              getValues={getFormValues}
              setValue={setFormValue as (name: string, value: any, options?: any) => void}
            />
          </div>
        )),
    [
      fields,
      register,
      control,
      errors,
      loading,
      resetKey,
      watchAllFields,
      getFormValues,
      setFormValue,
    ]
  );

  const formContent = (
    <div className={classNames('grid grid-cols-12 gap-4', formProps?.gridClassName)}>
      {renderFields}
      <div
        className={classNames(`col-span-12 grid gap-4 ${actionButtons?.className}`, {
          'grid-cols-2': actionButtons.reset,
        })}
      >
        {actionButtons.reset && (
          <Button
            className="col-span-1"
            variant="secondary"
            onClick={() => {
              reset();
              setResetKey((prev) => prev + 1); // Increment reset key to force remount
            }}
            // type="reset"
          >
            Reset
          </Button>
        )}
        {actionButtons.submit && (
          <Button
            className="col-span-1"
            variant="solid"
            type="submit"
            loading={loading}
            disabled={loading}
            icon={actionButtons.icon}
          >
            {loading ? actionButtons.loadingText : actionButtons.text}
          </Button>
        )}
      </div>
    </div>
  );

  const content = (
    <Form onSubmit={handleSubmit(handleFormSubmit as any)}>
      <fieldset disabled={formProps?.disabled || loading}>{formContent}</fieldset>
    </Form>
  );

  if (cardProps) {
    const { title, extra, ...restCardProps } = cardProps;
    return (
      <Card {...restCardProps} className={className}>
        {title && <div className="mb-4">{title}</div>}
        {content}
        {extra && <div className="mt-4">{extra}</div>}
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
};

export default BaseFormComponent;
