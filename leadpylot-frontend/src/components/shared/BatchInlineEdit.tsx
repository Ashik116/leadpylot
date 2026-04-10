'use client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import InlineEditField from './InlineEditField';
import { useState, useCallback, useEffect, useMemo } from 'react';
import CopyButton from './CopyButton';

interface BatchInlineEditProps {
  disableInteractionLead?: boolean;
  fields: Array<{
    key: string;
    value: string;
    label: string;
    type?: 'text' | 'email' | 'tel' | 'number';
    placeholder?: string;
    icon?: string;
    textClassName?: string;
    isCopyable?: boolean;
  }>;
  onBatchSave: (changes: Record<string, string>) => Promise<void>;
  enableInlineEditing?: boolean;
  className?: string;
  children?: React.ReactNode;
  extraActions?: (field: any) => React.ReactNode;
  leadId?: string;
  onSecondaryEmailUpdate?: (email: string) => Promise<void>;
  onMakePrimaryEmail?: (email: string) => Promise<void>;
}

const BatchInlineEdit = ({
  disableInteractionLead = false,
  fields,
  onBatchSave,
  enableInlineEditing = true,
  className = '',
  children,
  extraActions,
  leadId,
  onSecondaryEmailUpdate,
  onMakePrimaryEmail,
}: BatchInlineEditProps) => {
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  // State for additional email field
  const [isAdditionalEmailExpanded, setIsAdditionalEmailExpanded] = useState(false);
  const [additionalEmailValue, setAdditionalEmailValue] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Create a stable field values object to prevent infinite re-renders
  const fieldValues = useMemo(() => {
    return fields.reduce(
      (acc, field) => {
        acc[field.key] = field.value;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [fields.map((f) => `${f.key}:${f.value}`).join('|')]);

  // Initialize original values
  useEffect(() => {
    setOriginalValues(fieldValues);
  }, [fieldValues]);

  const handleBatchChange = useCallback((fieldKey: string, value: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  }, []);

  // Check if a specific field has changes
  const hasFieldChanges = useCallback(
    (fieldKey: string) => {
      const currentValue = pendingChanges[fieldKey] || originalValues[fieldKey];
      const originalValue = originalValues[fieldKey];
      return currentValue !== originalValue;
    },
    [pendingChanges, originalValues]
  );

  const handleSaveAllChanges = useCallback(async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setIsSaving(true);
    try {
      await onBatchSave(pendingChanges);
      // Update original values to match the saved changes
      setOriginalValues((prev) => ({
        ...prev,
        ...pendingChanges,
      }));
      setPendingChanges({});
      toast.push(<Notification type="success">All changes saved successfully</Notification>);
    } catch {
      toast.push(<Notification type="danger">Failed to save changes</Notification>);
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, onBatchSave]);

  const handleCancelAllChanges = useCallback(() => {
    setPendingChanges({});
    toast.push(<Notification type="info">All changes cancelled</Notification>);
  }, []);

  // Handle additional email submit
  const handleAdditionalEmailSubmit = async () => {
    if (!additionalEmailValue.trim() || !onSecondaryEmailUpdate) return;

    setIsSubmittingEmail(true);
    try {
      await onSecondaryEmailUpdate(additionalEmailValue.trim());
      setIsAdditionalEmailExpanded(false);
      setAdditionalEmailValue('');
    } catch (error) {
      console.error('Failed to save secondary email:', error);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Handle make primary email
  const handleMakePrimaryEmail = async () => {
    if (!additionalEmailValue.trim() || !onMakePrimaryEmail) return;

    setIsSubmittingEmail(true);
    try {
      await onMakePrimaryEmail(additionalEmailValue.trim());
      setIsAdditionalEmailExpanded(false);
      setAdditionalEmailValue('');
    } catch (error) {
      console.error('Failed to make primary email:', error);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Handle close additional email field
  const handleCloseAdditionalEmail = () => {
    setIsAdditionalEmailExpanded(false);
    setAdditionalEmailValue('');
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className={className}>
      {children}
      {fields?.map((field) => {
        const fieldHasChanges = hasFieldChanges(field?.key);

        // For secondary email logic
        const isEmailFrom = field.key === 'email_from';
        const secondaryEmailField = fields.find((f) => f.key === 'secondary_email');
        const hasSecondaryEmail = !!(secondaryEmailField && secondaryEmailField.value);

        return (
          <div key={field.key} className="group w-full">
            <div className="flex w-full flex-wrap items-center justify-between gap-x-2">
              <div className="flex min-w-0 items-center gap-x-1">
                <div className="flex min-w-fit items-center gap-x-2 text-gray-600">
                  {field?.icon && <ApolloIcon name={field.icon as any} className="text-sm" />}
                  <span className="text-sm font-medium">{field?.label}</span>
                </div>
                <div className="block w-full">
                  <div className="flex min-w-0 flex-1 items-center gap-x-2">
                    <div className="max-h-min min-h-6">
                      <InlineEditField
                        value={pendingChanges[field?.key] ?? field?.value}
                        onSave={async () => {}}
                        type={field?.type}
                        placeholder={field?.placeholder}
                        enableInlineEditing={enableInlineEditing}
                        batchMode={true}
                        onBatchChange={handleBatchChange}
                        fieldKey={field?.key}
                        hasPendingChanges={fieldHasChanges}
                        textClassName={field?.textClassName}
                      />
                    </div>
                    {field?.isCopyable && <CopyButton value={field?.value} />}
                    {isEmailFrom && !hasSecondaryEmail && (
                      <Button
                        disabled={disableInteractionLead}
                        size="xs"
                        variant="plain"
                        icon={<ApolloIcon name="plus" className="text-sm" />}
                        onClick={() => setIsAdditionalEmailExpanded(!isAdditionalEmailExpanded)}
                        className="flex items-center justify-center opacity-0 group-hover:opacity-100"
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">{extraActions?.(field)}</div>
            </div>

            {/* Expanded additional email input field */}
            {isEmailFrom && isAdditionalEmailExpanded && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Enter additional email"
                    value={additionalEmailValue}
                    onChange={(e) => setAdditionalEmailValue(e.target.value)}
                    className="w-full"
                    disabled={isSubmittingEmail}
                  />
                </div>
                <Button
                  size="sm"
                  variant="plain"
                  icon={<ApolloIcon name="cross" className="text-sm" />}
                  onClick={handleCloseAdditionalEmail}
                  className="text-gray-600 hover:text-gray-900"
                  disabled={isSubmittingEmail || disableInteractionLead}
                />
                <Button
                  size="sm"
                  variant="solid"
                  onClick={handleAdditionalEmailSubmit}
                  disabled={!additionalEmailValue.trim() || isSubmittingEmail}
                  loading={isSubmittingEmail}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {hasChanges && (
        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            variant="solid"
            onClick={handleSaveAllChanges}
            disabled={isSaving}
            icon={
              isSaving ? (
                <ApolloIcon name="loading" className="animate-spin" />
              ) : (
                <ApolloIcon name="check" />
              )
            }
          >
            {isSaving ? 'Saving...' : `Save ${Object.keys(pendingChanges).length} Changes`}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleCancelAllChanges}
            disabled={isSaving}
            icon={<ApolloIcon name="times" />}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default BatchInlineEdit;
