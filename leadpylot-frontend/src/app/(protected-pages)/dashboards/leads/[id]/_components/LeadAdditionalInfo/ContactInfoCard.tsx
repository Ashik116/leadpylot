import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import ApolloIcon, { APOLLO_ICONS } from '@/components/ui/ApolloIcon';
import InlineEditField from '@/components/shared/InlineEditField';
import BatchInlineEdit from '@/components/shared/BatchInlineEdit';
import { Lead } from '@/services/LeadsService';
import { useState } from 'react';
import classNames from '@/utils/classNames';
import { useUpdateSecondaryEmail, useMakePrimaryEmail } from '@/services/hooks/useLeads';
import ContactNameWithTitle from './ContactNameWithTitle';
import CopyButton from '@/components/shared/CopyButton';
import { Popover } from '@/components/ui/Popover';
import Tooltip from '@/components/ui/Tooltip';

const EMAIL_SECONDARY_PLUS_TOOLTIP =
  'Add email (+): expands a field to add a secondary email for this lead. Save stores it on the contact; you can later promote it to primary from the secondary email options when available.';

const SECONDARY_EMAIL_MORE_MENU_TOOLTIP =
  'Email options (⋯): open the menu to promote the secondary address to primary for this lead (confirmation required).';

const CONTACT_COMPOSE_EMAIL_BUTTON_TOOLTIP =
  'Email: open the compose dialog to write to this lead using the primary contact address.';

const CONTACT_LABEL_EMAIL_TOOLTIP =
  'Email: click the label to open compose mail to this lead (same as the Email button).';

const CONTACT_LABEL_PHONE_TOOLTIP =
  'Phone: click the label to start a call to this number when your phone or VoIP integration is set up.';

// Format amount in "k" format (e.g., 14370 -> 14.37k, 17106 -> 17.11k)
const formatAmountK = (value: number | string | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numValue)) return 'N/A';
  if (numValue < 1000) return String(value);
  const inK = numValue / 1000;
  if (inK % 1 === 0) return `${inK}k`;
  return `${parseFloat(inK.toFixed(2))}k`;
};

// Parse display value back to stored number (e.g., "14.37k" or "14.37" -> 14370)
const parseAmountFromDisplay = (str: string): string => {
  const s = String(str).trim().toLowerCase().replace(/\s/g, '');
  if (!s) return '';
  const hasK = s.endsWith('k');
  const numStr = hasK ? s.slice(0, -1) : s;
  const num = parseFloat(numStr);
  if (isNaN(num)) return str;
  const value = hasK ? Math.round(num * 1000) : num;
  return String(value);
};

interface ContactField {
  key:
    | 'contact_name'
    | 'email_from'
    | 'phone'
    | 'expected_revenue'
    | 'secondary_email'
    | 'lead_source_no';
  label: string;
  icon: keyof typeof APOLLO_ICONS;
  type: 'text' | 'email' | 'tel';
  placeholder: string;
  textClassName?: string;
  isCopyable?: boolean;
}

interface ContactInfoCardProps {
  lead: Lead;
  onSendEmailClick: () => void;
  onCallClick: () => void;
  onContactUpdate?: any;
  onBatchContactUpdate?: (changes: Record<string, string>) => Promise<void>;
  enableInlineEditing?: boolean;
  batchMode?: boolean;
  className?: string;
  leadExpandView?: boolean;
  disableInteractionLead?: boolean;
}

const CONTACT_FIELDS: ContactField[] = [
  {
    key: 'contact_name',
    label: 'Contact',
    icon: 'user',
    type: 'text',
    placeholder: 'Enter contact name',
    textClassName: 'max-w-[40ch] truncate overflow-hidden text-ellipsis',
    isCopyable: true,
  },
  {
    key: 'email_from',
    label: 'Email',
    icon: 'mail',
    type: 'email',
    placeholder: 'Enter email',
    textClassName: '2xl:max-w-[24ch] xl:max-w-[18ch] max-w-[28ch]  overflow-hidden text-ellipsis',
    isCopyable: true,
  },
  {
    key: 'secondary_email',
    label: '2nd Email',
    icon: 'mail',
    type: 'email',
    placeholder: 'Enter secondary email',
    textClassName: '2xl:max-w-[24ch] xl:max-w-[18ch] max-w-[28ch]  overflow-hidden text-ellipsis',
    isCopyable: true,
  },
  {
    key: 'phone',
    label: 'Phone',
    icon: 'phone',
    type: 'tel',
    placeholder: 'Enter phone number',
    textClassName:
      '2xl:max-w-[24ch] xl:max-w-[18ch] max-w-[28ch]  truncate overflow-hidden text-ellipsis',
    isCopyable: true,
  },
  {
    key: 'expected_revenue',
    label: 'Amount',
    icon: 'dollar',
    type: 'text',
    placeholder: 'Enter expected revenue',
    textClassName: 'max-w-[15ch] truncate overflow-hidden text-ellipsis',
    isCopyable: false,
  },
  {
    key: 'lead_source_no',
    label: 'Partner ID',
    icon: 'tag',
    type: 'text',
    placeholder: 'Enter partner ID',
    textClassName: 'max-w-[15ch] truncate overflow-hidden text-ellipsis',
    isCopyable: true,
  },
];

const ContactInfoCard = ({
  lead,
  onSendEmailClick,
  onCallClick,
  onContactUpdate,
  onBatchContactUpdate,
  enableInlineEditing = true,
  batchMode = false,
  className = '',
  leadExpandView = false,
  disableInteractionLead = false,
}: ContactInfoCardProps) => {
  // Hooks for secondary email functionality
  const updateSecondaryEmailMutation = useUpdateSecondaryEmail(lead?._id || '');
  const makePrimaryEmailMutation = useMakePrimaryEmail(lead?._id || '');

  const [primaryPopoverOpen, setPrimaryPopoverOpen] = useState(false);

  // State for additional email field
  const [isAdditionalEmailExpanded, setIsAdditionalEmailExpanded] = useState(false);
  const [additionalEmailValue, setAdditionalEmailValue] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  // Handle contact field update (parse amount from "14.37k" back to 14370 when saving)
  const handleContactUpdate = async (fieldKey: string, value: string) => {
    if (!onContactUpdate) return;
    const valueToSave = fieldKey === 'expected_revenue' ? parseAmountFromDisplay(value) : value;
    await onContactUpdate(fieldKey, valueToSave);
  };

  // Handle batch contact update
  const handleBatchContactUpdate = async (changes: Record<string, string>) => {
    if (onBatchContactUpdate) {
      await onBatchContactUpdate(changes);
    }
  };

  // Handle secondary email update
  const handleSecondaryEmailUpdate = async (email: string) => {
    setIsSubmittingEmail(true);
    try {
      await updateSecondaryEmailMutation.mutateAsync({ secondary_email: email });
      setIsAdditionalEmailExpanded(false);
      setAdditionalEmailValue('');
    } catch {
      // Failed to save secondary email
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Handle make primary email
  const handleMakePrimaryEmail = async (email: string) => {
    try {
      await makePrimaryEmailMutation.mutateAsync({ email });
      setPrimaryPopoverOpen(false);
    } catch {
      // Failed to make primary email
    }
  };

  // Handle close additional email field
  const handleCloseAdditionalEmail = () => {
    setIsAdditionalEmailExpanded(false);
    setAdditionalEmailValue('');
  };

  // Filter fields based on secondary_email existence
  const getFieldsToDisplay = () => {
    const hasSecondaryEmail = !!lead?.secondary_email;
    // Filter out secondary_email from main fields if it exists (it will be shown separately)
    // If it doesn't exist, we'll show the plus icon instead
    return CONTACT_FIELDS?.filter((field) => {
      if (field.key === 'secondary_email' && hasSecondaryEmail) {
        return true; // Show secondary_email field if it exists
      }
      if (field.key === 'secondary_email' && !hasSecondaryEmail) {
        return false; // Don't show secondary_email field if it doesn't exist (plus icon will show)
      }
      return true;
    });
  };

  return (
    <Card
      className={classNames('h-full w-full', className)}
      bodyClass="rounded-lg  overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <h6 className="font-semibold text-black dark:text-[var(--dm-text-primary)]">Contact Information</h6>
      </div>
      {batchMode && onBatchContactUpdate ? (
        <BatchInlineEdit
          disableInteractionLead={disableInteractionLead}
          fields={getFieldsToDisplay()?.map((field) => ({
            key: field?.key,
            value:
              field?.key === 'expected_revenue'
                ? formatAmountK(lead?.[field?.key as keyof Lead] as number | string | undefined)
                : lead?.[field?.key as keyof Lead] || '',
            label: field?.label,
            type: field?.type,
            placeholder: field?.placeholder,
            icon: field?.icon,
            textClassName: field?.textClassName,
            isCopyable: field?.isCopyable,
          }))}
          className="space-y-0"
          onBatchSave={handleBatchContactUpdate}
          enableInlineEditing={enableInlineEditing}
          leadId={lead?._id}
          onSecondaryEmailUpdate={handleSecondaryEmailUpdate}
          onMakePrimaryEmail={handleMakePrimaryEmail}
          extraActions={(field) => {
            if (leadExpandView) return null;

            if (field?.key === 'secondary_email' && lead?.secondary_email) {
              return (
                <Tooltip
                  title={SECONDARY_EMAIL_MORE_MENU_TOOLTIP}
                  placement="top"
                  wrapperClass="inline-flex shrink-0"
                  className="max-w-sm! text-xs leading-snug"
                >
                  <Popover
                    placement="top"
                    isOpen={primaryPopoverOpen}
                    onOpenChange={setPrimaryPopoverOpen}
                    className="min-w-[120px]"
                    content={
                      <div className="p-2">
                        <p className="mb-2 text-sm ">
                          Are you sure you want to make this email primary?
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="xs"
                            variant="plain"
                            onClick={() => setPrimaryPopoverOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="xs"
                            variant="solid"
                            onClick={() => handleMakePrimaryEmail(lead?.secondary_email || '')}
                            disabled={makePrimaryEmailMutation.isPending || disableInteractionLead}
                            loading={makePrimaryEmailMutation.isPending}
                          >
                            Make Primary
                          </Button>
                        </div>
                      </div>
                    }
                  >
                    <Button
                      size="xs"
                      variant="plain"
                      icon={<ApolloIcon name="more-h" className="text-base" />}
                      className="shrink-0"
                      aria-label="Secondary email options"
                    />
                  </Popover>
                </Tooltip>
              );
            }

            // Email button only (phone uses label/icon click like email)
            if (field?.key === 'email_from')
              return (
                <Tooltip
                  title={CONTACT_COMPOSE_EMAIL_BUTTON_TOOLTIP}
                  placement="top"
                  wrapperClass="inline-flex shrink-0"
                  className="max-w-sm! text-xs leading-snug"
                >
                  <Button
                    size="xs"
                    variant="secondary"
                    icon={<ApolloIcon name="mail" />}
                    onClick={onSendEmailClick}
                    className="shrink-0"
                    disabled={disableInteractionLead}
                  >
                    <span className="hidden sm:inline">Email</span>
                    <span className="sm:hidden">Email</span>
                  </Button>
                </Tooltip>
              );

            return null;
          }}
        ></BatchInlineEdit>
      ) : (
        getFieldsToDisplay()?.map((field) => {
          const isEmailFrom = field.key === 'email_from';
          const isPhone = field.key === 'phone';
          const hasSecondaryEmail = !!lead?.secondary_email;
          const isLabelClickable = (isEmailFrom || isPhone) && !disableInteractionLead;
          const handleLabelClick = isEmailFrom
            ? onSendEmailClick
            : isPhone
              ? onCallClick
              : undefined;

          return (
            <div key={field?.key} className="group space-y-0">
              <div className="flex min-h-6 items-center gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-1">
                  {isLabelClickable ? (
                    <Tooltip
                      title={isEmailFrom ? CONTACT_LABEL_EMAIL_TOOLTIP : CONTACT_LABEL_PHONE_TOOLTIP}
                      placement="top"
                      wrapperClass="inline-flex min-w-[90px] shrink-0"
                      className="max-w-sm! text-xs leading-snug"
                    >
                      <div
                        className={classNames(
                          'flex min-w-[90px] shrink-0 items-center gap-2 text-black',
                          'cursor-pointer hover:text-gray-600'
                        )}
                        onClick={handleLabelClick}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleLabelClick?.();
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <ApolloIcon name={field?.icon} className="shrink-0 text-sm" />
                        <span className="text-sm font-medium text-black">{field?.label}</span>
                      </div>
                    </Tooltip>
                  ) : (
                    <div className="flex min-w-[90px] shrink-0 items-center gap-2 text-black">
                      <ApolloIcon name={field?.icon} className="shrink-0 text-sm" />
                      <span className="text-sm font-medium text-black">{field?.label}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left text-black">
                    <div className="flex items-center gap-2">
                      {field.key === 'contact_name' ? (
                        <>
                          <ContactNameWithTitle
                            nameValue={lead.contact_name || ''}
                            titleValue={lead.nametitle || ''}
                            onNameSave={(val) => handleContactUpdate('contact_name', val)}
                            onTitleSave={(val) => handleContactUpdate('nametitle', val)}
                            disabled={!enableInlineEditing || disableInteractionLead}
                          />
                          {field?.isCopyable && (
                            <CopyButton value={lead?.[field?.key as keyof Lead] || ''} />
                          )}
                        </>
                      ) : enableInlineEditing && onContactUpdate ? (
                        <div className="flex flex-1 items-center justify-start gap-2">
                          <InlineEditField
                            value={
                              field?.key === 'expected_revenue'
                                ? formatAmountK(
                                    lead?.[field?.key as keyof Lead] as number | string | undefined
                                  )
                                : (lead?.[field?.key as keyof Lead] as string) || ''
                            }
                            onSave={(value) =>
                              field.key === 'secondary_email'
                                ? handleSecondaryEmailUpdate(value)
                                : handleContactUpdate(field?.key, value)
                            }
                            type={field?.type}
                            placeholder={field?.placeholder}
                            textClassName={classNames(
                              field?.textClassName,
                              'font-normal text-black'
                            )}
                          />
                          {field?.isCopyable && (
                            <CopyButton value={lead?.[field?.key as keyof Lead] || ''} />
                          )}
                          {isEmailFrom && !hasSecondaryEmail && (
                            <Tooltip
                              title={EMAIL_SECONDARY_PLUS_TOOLTIP}
                              placement="top"
                              wrapperClass="inline-flex opacity-0 group-hover:opacity-100"
                              className="max-w-sm! text-xs leading-snug"
                            >
                              <Button
                                disabled={disableInteractionLead}
                                size="xs"
                                variant="plain"
                                icon={<ApolloIcon name="plus" className="text-sm" />}
                                onClick={() =>
                                  setIsAdditionalEmailExpanded(!isAdditionalEmailExpanded)
                                }
                                className="flex items-center justify-center"
                                aria-label="Add secondary email"
                              />
                            </Tooltip>
                          )}
                        </div>
                      ) : (
                        <div className="relative" style={{ minHeight: '34px' }}>
                          <div className="absolute inset-0 flex items-center">
                            <span className="3xl:text-base text-xs text-black">
                              {field?.key === 'expected_revenue'
                                ? formatAmountK(
                                    lead?.[field?.key as keyof Lead] as number | string | undefined
                                  )
                                : (lead?.[field?.key as keyof Lead] as string) || 'N/A'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {field.key === 'secondary_email' && lead?.secondary_email && (
                  <Tooltip
                    title={SECONDARY_EMAIL_MORE_MENU_TOOLTIP}
                    placement="top"
                    wrapperClass="inline-flex shrink-0"
                    className="max-w-sm! text-xs leading-snug"
                  >
                    <Popover
                      placement="top"
                      isOpen={primaryPopoverOpen}
                      onOpenChange={setPrimaryPopoverOpen}
                      className="min-w-[200px]"
                      content={
                        <div className="p-3">
                          <p className="mb-2 text-sm text-gray-700">
                            Are you sure you want to make this email primary?
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="xs"
                              variant="plain"
                              onClick={() => setPrimaryPopoverOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="xs"
                              variant="solid"
                              onClick={() => handleMakePrimaryEmail(lead?.secondary_email || '')}
                              disabled={makePrimaryEmailMutation.isPending || disableInteractionLead}
                              loading={makePrimaryEmailMutation.isPending}
                            >
                              Make Primary
                            </Button>
                          </div>
                        </div>
                      }
                    >
                      <Button
                        size="xs"
                        variant="plain"
                        icon={<ApolloIcon name="more-h" className="text-base" />}
                        className="shrink-0"
                        aria-label="Secondary email options"
                      />
                    </Popover>
                  </Tooltip>
                )}
              </div>

              {/* Expanded additional email input field (when adding 2nd email) */}
              {isEmailFrom && !hasSecondaryEmail && isAdditionalEmailExpanded && (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      size="xs"
                      placeholder="Enter additional email"
                      value={additionalEmailValue}
                      onChange={(e) => setAdditionalEmailValue(e.target.value)}
                      className="w-full"
                      disabled={isSubmittingEmail}
                    />
                  </div>
                  <Button
                    size="xs"
                    variant="plain"
                    icon={<ApolloIcon name="cross" className="text-sm" />}
                    onClick={handleCloseAdditionalEmail}
                    className="text-gray-600 hover:text-gray-900"
                    disabled={isSubmittingEmail || disableInteractionLead}
                  />
                  <Button
                    size="xs"
                    variant="solid"
                    onClick={() => handleSecondaryEmailUpdate(additionalEmailValue)}
                    disabled={!additionalEmailValue.trim() || isSubmittingEmail}
                    loading={isSubmittingEmail}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          );
        })
      )}
    </Card>
  );
};

export default ContactInfoCard;
