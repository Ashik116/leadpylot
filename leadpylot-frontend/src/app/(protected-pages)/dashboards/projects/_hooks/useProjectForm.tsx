import { FieldDefinition } from '@/components/shared/form/types';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { ProjectDetails as ProjectDetailsType } from '@/services/ProjectsService';
import { memo, useMemo } from 'react';
import { components } from 'react-select';
import { z } from 'zod';

// Define schemas
const bankSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const agentSchema = z.object({
  user_id: z.string(),
  alias_name: z.string(),
  email_address: z.string(),
  email_password: z.string(),
  voip_username: z.string(),
  voip_password: z.string(),
});

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name must be less than 200 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  project_website: z
    .union([
      z.string().url('Please enter a valid URL (e.g., https://example.com)'),
      z.literal(''),
    ])
    .optional(),
  deport_link: z
    .union([
      z.string().url('Please enter a valid URL (e.g., https://example.com)'),
      z.literal(''),
    ])
    .optional(),
  inbound_email: z
    .union([
      z.string().email('Please enter a valid email address'),
      z.literal(''),
    ])
    .optional(),
  inbound_number: z
    .union([
      z
        .string()
        .regex(/^[\d\s\-\+\(\)]*$/, 'Please enter a valid phone number')
        .max(50, 'Phone number must be less than 50 characters'),
      z.literal(''),
    ])
    .optional(),
  voipserver_id: z.object({
    label: z.string(),
    value: z.string(),
  }).optional().nullable(),
  mailserver_id: z
    .object({
      label: z.string(),
      value: z.string(),
    }).optional().nullable(),
  mailservers: z.array(bankSchema).default([]).optional(),
  email_template_id: z
    .object({
      label: z.string(),
      value: z.string(),
    })
    .optional()
    .nullable(),
  contract: z.any().optional(),
  confirmation_email: z.any().optional(),
  agents: z.array(agentSchema).optional(),
  banks: z.array(bankSchema).default([]).optional(),
  pdf_templates: z.array(bankSchema).default([]).optional(),
  email_templates: z.array(bankSchema).default([]).optional(),
  color_code: z.string().optional(),
  outbound_cid: z.string().optional().or(z.literal('')),
  inbound_did: z.string().optional().or(z.literal('')),
  trunk_name: z.string().optional().or(z.literal('')),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

interface UseProjectFormProps {
  isCreateComponent: boolean;
  projectData?: ProjectDetailsType;
  formState?: {
    sidebarVisible?: boolean;
    isEditing?: boolean;
    projectCreated?: boolean;
    project?: any;
  };
  formCallbacks?: {
    setSelectedDropdown?: (value: any) => void;
    setSelectedBank?: (value: any) => void;
    setSelectedPdfTemplate?: (value: any) => void;
    setLastSelectedType?: (type: any) => void;
    setSidebarVisible?: (visible: boolean) => void;
    setSidebarKey?: (fn: (prev: number) => number) => void;
  };
}

const createInputField = (
  name: string,
  label: string,
  inputType: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url' | 'germany' | 'date',
  placeholder: string,
  isDisabled: boolean
): FieldDefinition => ({ name, label, size: 'md', type: 'input', inputType, placeholder, className: 'col-span-12 md:col-span-6 text-sm', disabled: isDisabled });

const createMultiValueComponent = (
  type: 'banks' | 'mail' | 'pdf_template' | 'email_template',
  isDisabled: boolean,
  formState: UseProjectFormProps['formState'],
  formCallbacks: UseProjectFormProps['formCallbacks']
) => {
  const config = {
    banks: { setter: formCallbacks?.setSelectedBank, type: 'banks' },
    mail: { setter: formCallbacks?.setSelectedDropdown, type: 'mail' },
    pdf_template: { setter: formCallbacks?.setSelectedPdfTemplate, type: 'pdf_template' },
    email_template: { setter: formCallbacks?.setSelectedDropdown, type: 'email_template' },
  }[type];

  const MultiValueComponent = memo(({ children, data, removeProps, ...props }: any) => {
    const modifiedRemoveProps = {
      ...removeProps,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        removeProps?.onClick?.(e);
      },
    };
    return (
      <div
        onClick={(e) => {
          // Prevent click if disabled
          if (isDisabled) {
            return;
          }
          // Allow clicks when form is not disabled
          // In create mode: enabled when projectCreated is false
          // In edit mode: enabled when isEditing is true
          e.stopPropagation();
          config.setter?.([data]);
          formCallbacks?.setLastSelectedType?.(config.type);
          formCallbacks?.setSidebarKey?.((prev: number) => prev + 1);
          if (!formState?.sidebarVisible) formCallbacks?.setSidebarVisible?.(true);
        }}
        className="cursor-pointer"
      >
        <components.MultiValue {...props} data={data} removeProps={modifiedRemoveProps}>
          {children}
        </components.MultiValue>
      </div>
    );
  });

  MultiValueComponent.displayName = `MultiValue_${type}`;
  return MultiValueComponent;
};

const createAsyncSelectField = (name: string, label: string, apiUrl: string, queryKey: string, addNewValue: string, sidebarType: string, selectType: string, isMulti: boolean, isDisabled: boolean, formState: UseProjectFormProps['formState'], formCallbacks: UseProjectFormProps['formCallbacks'],
  options?: {
    multiValueType?: 'banks' | 'mail' | 'pdf_template' | 'email_template';
    fieldName?: string;
    maxMenuHeight?: number;
  }
): FieldDefinition => {
  const handleChange = (newValues: any, actionMeta: any, _setValue: any, onChange: any, currentValue?: any) => {
    if (!formCallbacks) return;

    const isAddNew = isMulti ? Array.isArray(newValues) && newValues.some((v: any) => v.value === addNewValue) : newValues?.value === addNewValue;

    if (isAddNew) {
      // Preserve existing selections - only remove the "Add New" option, don't clear all
      const preservedValues = isMulti
        ? (Array.isArray(newValues) ? newValues.filter((v: any) => v?.value !== addNewValue) : [])
        : (currentValue ?? null);
      onChange?.(preservedValues);
      if (name === 'pdf_templates') {
        formCallbacks.setSidebarVisible?.(false);
        return;
      }
      formCallbacks.setLastSelectedType?.(`new_${selectType}`);
      formCallbacks.setSidebarVisible?.(true);
      return;
    }

    // Always update form field value first
    onChange?.(isMulti ? Array.from(newValues || []) : newValues);

    // Determine the setter based on field name and multiValueType
    const isMailServersField = name === 'mailservers';
    const isMailServerIdField = name === 'mailserver_id';
    const isVoipServerIdField = name === 'voipserver_id';

    if (actionMeta?.action === 'select-option' && actionMeta?.option) {
      const setter = options?.multiValueType === 'banks'
        ? formCallbacks.setSelectedBank
        : options?.multiValueType === 'mail'
          ? formCallbacks.setSelectedDropdown
          : options?.multiValueType === 'pdf_template'
            ? formCallbacks.setSelectedPdfTemplate
            : isMailServerIdField || isVoipServerIdField
              ? formCallbacks.setSelectedDropdown
              : null;

      // Update sidebar selection for the correct field
      if (setter) {
        // For mailservers (Additional Mail Servers), pass array to distinguish from mailserver_id
        // For mailserver_id (Primary Mail Server), pass single object
        if (isMailServersField) {
          // Pass as array to indicate it's from Additional Mail Servers field
          setter?.(isMulti ? newValues : [actionMeta.option]);
        } else {
          // Pass as single object for Primary Mail Server
          setter?.(isMulti ? [actionMeta.option] : actionMeta.option);
        }
        formCallbacks.setLastSelectedType?.(sidebarType);
        formCallbacks.setSidebarKey?.((prev: number) => prev + 1);
        if (!formState?.sidebarVisible) formCallbacks.setSidebarVisible?.(true);
      }
    } else {
      const setter = options?.multiValueType === 'banks'
        ? formCallbacks.setSelectedBank
        : options?.multiValueType === 'mail'
          ? formCallbacks.setSelectedDropdown
          : options?.multiValueType === 'pdf_template'
            ? formCallbacks.setSelectedPdfTemplate
            : isMailServerIdField || isVoipServerIdField
              ? formCallbacks.setSelectedDropdown
              : null;

      // Update sidebar selection for the correct field
      if (setter) {
        // For mailservers (Additional Mail Servers), pass array to distinguish from mailserver_id
        // For mailserver_id (Primary Mail Server) and voipserver_id, pass single object or null
        if (isMailServersField) {
          // Pass as array to indicate it's from Additional Mail Servers field
          setter?.(isMulti ? newValues : (newValues ? [newValues] : []));
        } else {
          // Pass as single object for Primary Mail Server or VOIP Server
          setter?.(newValues);
        }
        if (isMulti) {
          formCallbacks.setLastSelectedType?.(
            Array.isArray(newValues) && newValues.length > 0 ? sidebarType : null
          );
        } else {
          // Single-select: set sidebar type if value exists, clear if null/undefined
          formCallbacks.setLastSelectedType?.(newValues ? sidebarType : null);
          if (newValues && !formState?.sidebarVisible) {
            formCallbacks.setSidebarVisible?.(true);
          }
        }
      }
    }
  };

  let optLabelKey = 'name';
  if (options?.multiValueType === 'banks') {
    optLabelKey = 'nickName';
  }
  return {
    name,
    label,
    type: 'asyncSelect',
    apiUrl,
    queryKey,
    optLabelKey: optLabelKey,
    optValueKey: '_id',
    isMulti,
    isClearable: true,
    size: 'md',
    sidebarVisible: formState?.sidebarVisible,
    className: 'col-span-12 md:col-span-6 text-sm',
    ...(options?.maxMenuHeight !== undefined && { maxMenuHeight: options?.maxMenuHeight }),
    disabled: isDisabled,
    onAsyncSelectChange: handleChange,
    formatOptionLabel: (option: any) =>
      option.value === addNewValue ? (
        <div className="text-ocean-2 flex items-center">
          <ApolloIcon name="plus" className="mr-2" />
          Add New {label.replace('Additional ', '').replace('Primary ', '')}
        </div>
      ) : (
        option.label
      ),
    ...(isMulti && options?.multiValueType && {
      customComponents: {
        MultiValue: createMultiValueComponent(
          options.multiValueType,
          isDisabled,
          formState,
          formCallbacks
        ),
      },
    }),
  };
};

export const useProjectForm = ({
  isCreateComponent,
  projectData,
  formState,
  formCallbacks,
}: UseProjectFormProps) => {
  const isDisabled = useMemo(() => isCreateComponent ? !!formState?.projectCreated : !formState?.isEditing,
    [isCreateComponent, formState]);

  const defaultValues = useMemo((): Partial<ProjectFormData> => {
    if (isCreateComponent) return { agents: [], banks: [], mailservers: [], pdf_templates: [], email_templates: [], color_code: '', outbound_cid: '', inbound_did: '', trunk_name: '' };


    const name = typeof projectData?.name === 'string' ? projectData.name : projectData?.name?.en_US || '';

    // Handle voipserver_id - check if it's an object (populated) or a string ID with name property
    let voipserver_id = null;
    if (projectData?.voipserver_id) {
      if (typeof projectData.voipserver_id === 'object' && projectData.voipserver_id !== null) {
        const voip = projectData.voipserver_id as any;
        voipserver_id = {
          label: voip.name || '',
          value: voip._id || voip.id || '',
        };
      } else if (typeof projectData.voipserver_id === 'string') {
        // String ID - check if there's a voipserver_name property
        const voipName = (projectData as any).voipserver_name;
        if (voipName) {
          voipserver_id = {
            label: voipName,
            value: projectData.voipserver_id,
          };
        }
      }
    }

    // Handle mailserver_id - check if it's an object (populated) or a string ID with name property
    let mailserver_id = null;
    if (projectData?.mailserver_id) {
      if (typeof projectData.mailserver_id === 'object' && projectData.mailserver_id !== null) {
        // Populated object with _id and name
        const mail = projectData.mailserver_id as any;
        mailserver_id = {
          label: mail.name || '',
          value: mail._id || mail.id || '',
        };
      } else if (typeof projectData.mailserver_id === 'string') {
        // String ID - check if there's a mailserver_name property
        const mailName = (projectData as any).mailserver_name;
        if (mailName) {
          mailserver_id = {
            label: mailName,
            value: projectData.mailserver_id,
          };
        }
      }
    }

    return {
      name,
      description: projectData?.description || '',
      project_website: projectData?.project_website || '',
      deport_link: projectData?.deport_link || '',
      inbound_email: projectData?.inbound_email || '',
      inbound_number: projectData?.inbound_number || '',
      voipserver_id,
      mailserver_id,
      mailservers: projectData?.mailservers?.map((ms: { _id: string; name: string }) => ({
        label: ms.name,
        value: ms._id,
      })) || [],
      banks: projectData?.banks?.map((bank) => ({ label: bank.nickName || bank.name, value: bank._id })) || [],
      contract: projectData?.contract || null,
      confirmation_email: projectData?.confirmation_email || null,
      pdf_templates: Array.isArray((projectData as any)?.pdf_templates)
        ? ((projectData as any).pdf_templates as Array<{ _id: string; name: string }>).map(
          (t) => ({ label: t.name, value: t._id })
        )
        : [],
      email_templates: Array.isArray(projectData?.email_templates)
        ? projectData?.email_templates?.map(
          (t) => ({ label: t.name, value: t._id })
        )
        : [],
      color_code: projectData?.color_code || '',
      outbound_cid: (projectData as any)?.outbound_cid || '',
      inbound_did: (projectData as any)?.inbound_did || '',
      trunk_name: (projectData as any)?.trunk_name || '',
    };
  }, [isCreateComponent, projectData]);

  // Memoize fields array to prevent recreation on every render
  const fields = useMemo(() => [
    createInputField('name', 'Project Name', 'text', 'My Project', isDisabled),
    createInputField('project_website', 'Project Website Link', 'url', 'https://example.com', isDisabled),
    createInputField('deport_link', 'Deport Link', 'url', 'https://deport.example.com', isDisabled),
    createInputField('inbound_email', 'Inbound Email', 'email', 'inbound@example.com', isDisabled),
    createInputField('inbound_number', 'Inbound Number', 'tel', '+1234567890', isDisabled),
    createInputField('outbound_cid', 'Outbound Caller ID', 'text', '+1234567890', isDisabled),
    createInputField('inbound_did', 'Inbound DID', 'text', '+1234567890', isDisabled),
    createInputField('trunk_name', 'Trunk Name', 'text', 'e.g. trunk-provider', isDisabled),
    createAsyncSelectField(
      'voipserver_id',
      'VOIP Server',
      '/settings/voipservers',
      'voip',
      'add-new-voip',
      'voip',
      'voip',
      false,
      isDisabled,
      formState,
      formCallbacks
    ),
    createAsyncSelectField(
      'banks',
      'Banks',
      '/banks?status=active',
      'banks',
      'add-new-bank',
      'banks',
      'bank',
      true,
      isDisabled,
      formState,
      formCallbacks,
      { multiValueType: 'banks', maxMenuHeight: 250 }
    ),
    // createAsyncSelectField(
    //   'mailserver_id',
    //   'Primary Mail Server',
    //   '/settings/mailservers',
    //   'mail',
    //   'add-new-mail',
    //   'mail',
    //   'mail',
    //   false,
    //   isDisabled,
    //   formState,
    //   formCallbacks
    // ),
    // createAsyncSelectField('mailservers', 'Additional Mail Servers', '/settings/mailservers', 'mail', 'add-new-mail', 'mail', 'mail', true, isDisabled, formState, formCallbacks, { multiValueType: 'mail' }),
    createAsyncSelectField('pdf_templates', 'PDF Templates', '/admin/pdf-templates', 'pdf_templates', 'add-new-pdf_template', 'pdf_template', 'pdf_template', true, isDisabled, formState, formCallbacks, { multiValueType: 'pdf_template' }),
    createAsyncSelectField('email_templates', 'Email Templates', '/settings/email_templates', 'email_templates', '', 'email_template', 'email_template', true, isDisabled, formState, formCallbacks, { multiValueType: 'email_template' }),
    {
      name: 'color_code',
      label: 'Color Code',
      type: 'color',
      className: 'col-span-12 md:col-span-6',
      disabled: isDisabled,
    },
    {
      name: 'description',
      label: 'Project Description',
      type: 'textarea',
      placeholder: 'Enter project description',
      className: 'col-span-12',
      disabled: isDisabled,
    },

  ], [isDisabled, formState, formCallbacks]);

  return { schema: projectSchema, fields, defaultValues };
};
