'use client';

import { LibraryImageUpload } from '@/components/shared/LibraryImageUpload/LibraryImageUpload';
import RichTextEditor from '@/components/shared/RichTextEditor/RichTextEditor';
import Button from '@/components/ui/Button';
import CheckboxOptionCard from '@/components/ui/CheckboxOptionCard';
import Input from '@/components/ui/Input';
import Dialog from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import SelectWithAddOption, { BaseOption } from '@/components/ui/SelectWithAddOption/SelectWithAddOption';
import { EmailTemplate } from '@/services/SettingsService';
import {
  useCreateEmailTemplateCategory,
  useEmailTemplateCategories,
  useUpdateEmailTemplateCategory,
} from '@/services/hooks/useEmailTemplateCategories';
import { useAllProjects } from '@/services/hooks/useProjects';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CategoryForm from './CategoryForm';
import './EmailTemplateForm.css';
import FormFieldGroup from './FormFieldGroup';
import { VariableSelector } from './VariableSelector';
import { useEmailTemplateEditor } from './useEmailTemplateEditor';
import { useEmailTemplateForm } from './useEmailTemplateForm';

type CategoryDialogMode = 'create' | { _id: string; name: string } | null;

interface EmailTemplateFormProps {
  initialData?: EmailTemplate & { include_signature?: boolean };
  isPage?: boolean;
  onSuccess?: (data: any) => void;
  onClose?: () => void;
}

const OFFER_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
];

const TYPE_OPTIONS = [
  { value: 'offer', label: 'Offer' },
  { value: 'other', label: 'Other' },
];

const GENDER_TYPE_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export default function EmailTemplateForm({
  initialData,
  isPage = true,
  onSuccess,
  onClose,
}: EmailTemplateFormProps) {
  const { formMethods, handleSubmit } = useEmailTemplateForm(initialData, isPage, onSuccess);
  const { register, formState: { errors }, setValue, watch, reset } = formMethods;
  const { data: categories = [] } = useEmailTemplateCategories();
  const createCategoryMutation = useCreateEmailTemplateCategory();
  const updateCategoryMutation = useUpdateEmailTemplateCategory();
  const [categoryDialogMode, setCategoryDialogMode] = useState<CategoryDialogMode>(null);

  const { data: projectsData } = useAllProjects({ limit: 200 });
  const projectOptions = useMemo(() => {
    const projects = (projectsData as any)?.data || [];
    return projects.map((p: any) => ({
      value: p._id,
      label: typeof p.name === 'string' ? p.name : p.name?.en_US || '',
    }));
  }, [projectsData]);

  const categoryOptions: BaseOption[] = categories.map((c) => ({
    value: c._id,
    label: c.name,
    _id: c._id,
    name: c.name,
  }));

  const handleCategoryChange = useCallback(
    (option: BaseOption | null) => {
      setValue('category_id', option?.value ?? '');
    },
    [setValue]
  );

  async function handleCategoryDialogSubmit(payload: { name: string }) {
    const mode = categoryDialogMode;
    if (mode === 'create') {
      const result = await createCategoryMutation.mutateAsync(payload);
      const newId = (result as { _id?: string })?._id ?? (result as { data?: { _id?: string } })?.data?._id;
      if (newId) setValue('category_id', newId);
    } else if (mode && typeof mode === 'object') {
      await updateCategoryMutation.mutateAsync({ id: mode._id, body: payload });
    }
    setCategoryDialogMode(null);
  }
  const initialContent = initialData?.template_content || '';
  const editor = useEmailTemplateEditor(initialContent, setValue);
  const include_signature = watch('include_signature');
  const how_many_offers = watch('how_many_offers');
  const parsedHowManyOffers = how_many_offers ? parseInt(how_many_offers, 10) : undefined;

  useEffect(() => {
    if (!initialData) return;
    const cat =
      initialData.category_id ?? (initialData as { category?: { _id?: string } })?.category;
    const categoryId = !cat ? '' : typeof cat === 'string' ? cat : (cat as { _id?: string })._id ?? '';
    reset({
      name: initialData.name || '',
      template_content: initialData.template_content || '',
      include_signature: initialData.include_signature || false,
      has_signature_file: initialData.has_signature_file || false,
      type: initialData.type || '',
      subject: initialData.subject || '',
      category_id: categoryId,
      how_many_offers: initialData.how_many_offers !== undefined ? String(initialData.how_many_offers) : '1',
      signature_file_id: initialData.signature_file_id?._id ?? '',
      gender_type: initialData.gender_type || null,
      project_ids: Array.isArray(initialData.projects)
        ? initialData.projects.map((p: any) => ({ label: p.name, value: p._id }))
        : [],
    });
    if (editor?.commands && initialData.template_content) {
      editor.commands.setContent(initialData.template_content);
    }
  }, [initialData, reset, editor]);

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto px-4.5">
          <div className="space-y-2 pb-20 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 ">
              <FormFieldGroup
                id="name"
                label="Template Name"
                error={errors.name?.message}
              >
                <Input id="name" type="text" {...register('name')} placeholder="Enter template name" />
              </FormFieldGroup>
              <FormFieldGroup id="category_id" label="Category" error={errors.category_id?.message}>
                <SelectWithAddOption
                  id="category_id"
                  options={categoryOptions}
                  value={
                    watch('category_id')
                      ? categoryOptions.find((o) => o.value === watch('category_id')) ?? null
                      : null
                  }
                  onChange={handleCategoryChange}
                  onAddNewSelect={() => setCategoryDialogMode('create')}
                  onEdit={(id, opt) => setCategoryDialogMode({ _id: id, name: opt.name ?? opt.label })}
                  addNewOption={{ label: '+ Add category', colorClass: 'text-blue-600' }}
                  placeholder="Select category"
                  isClearable
                />
              </FormFieldGroup>
              <FormFieldGroup
                id="how_many_offers"
                label="How many offers"
                error={errors.how_many_offers?.message}
              >
                <Select
                  id="how_many_offers"
                  options={OFFER_OPTIONS}
                  value={
                    watch('how_many_offers')
                      ? { value: watch('how_many_offers'), label: watch('how_many_offers') }
                      : null
                  }
                  onChange={(option: any) => setValue('how_many_offers', option?.value || '')}
                  placeholder="Select how many offers"
                  isClearable
                />
              </FormFieldGroup>
              {/* <FormFieldGroup id="type" label="Type" error={errors.type?.message}>
                <Select
                  id="type"
                  options={TYPE_OPTIONS}
                  value={watch('type') ? { value: watch('type'), label: watch('type') } : null}
                  onChange={(option: any) => setValue('type', option?.value || '')}
                  placeholder="Select type"
                  isClearable
                />
              </FormFieldGroup> */}
              <FormFieldGroup id="gender_type" label="Gender Type" error={(errors as any).gender_type?.message}>
                <Select
                  id="gender_type"
                  options={GENDER_TYPE_OPTIONS}
                  value={
                    watch('gender_type')
                      ? GENDER_TYPE_OPTIONS.find((o) => o.value === watch('gender_type')) ?? null
                      : null
                  }
                  onChange={(option: any) => setValue('gender_type', option?.value || null)}
                  placeholder="Select gender type"
                  isClearable
                />
              </FormFieldGroup>
              <div className="col-span-1 md:col-span-4">
                <FormFieldGroup id="project_ids" label="Projects" error={(errors as any).project_ids?.message}>
                  <Select
                    id="project_ids"
                    isMulti
                    options={projectOptions}
                    value={watch('project_ids') || []}
                    onChange={(options: any) => setValue('project_ids', options || [])}
                    placeholder="Select projects"
                    isClearable
                  />
                </FormFieldGroup>
              </div>
              <div className="col-span-1  md:col-span-4">
                <VariableSelector editor={editor} howManyOffers={parsedHowManyOffers} />
              </div>
              <div className="col-span-1 md:col-span-4 ">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <FormFieldGroup
                    id="subject"
                    label="Email Subject"
                    error={errors.subject?.message}
                    className="col-span-2"
                  >
                    <Input
                      id="subject"
                      type="text"
                      {...register('subject')}
                      placeholder="Enter email subject"
                    />
                  </FormFieldGroup>

                  {/* Email Signature upload temporarily disabled */}
                  {/* <LibraryImageUpload
                    value={watch('signature_file_id') || null}
                    onChange={(id) => setValue('signature_file_id', id ?? '')}
                    label="Email Signature"
                    documentType="extra"
                    accept=".jpg,.jpeg,.png"
                    maxFileSize={500 * 1024}
                  /> */}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="template_content" className="mb-2 block text-sm font-medium opacity-70">
                Template Content
              </label>
              <div className=" relative">
                <RichTextEditor customEditor={editor} editorContentClass="h-80 md:h-[33dvh] overflow-y-auto" />
              </div>
              {errors?.template_content && (
                <p className="mt-1 text-xs text-red-500">{errors.template_content.message}</p>
              )}
            </div>

            {/* Include Email Signature temporarily disabled */}
            {/* <CheckboxOptionCard
              id="include_signature"
              checked={include_signature || false}
              onChange={(checked) => setValue('include_signature', checked)}
              label="Include Email Signature"
              description="Append your uploaded signature to emails sent using this template"
            /> */}
            <div className="sticky bottom-0 z-10 shrink-0 border-t border-gray-200 px-4.5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="solid">
                  {initialData ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          </div>

        </div>
      </form>

      <Dialog
        isOpen={!!categoryDialogMode}
        onClose={() => setCategoryDialogMode(null)}
        width={420}
        contentClassName="p-3"
      >
        <div className="border-b border-gray-200 pb-1">
          <h4 className="text-base font-semibold text-gray-900">
            {categoryDialogMode === 'create' ? 'Add new category' : 'Edit category'}
          </h4>
        </div>
        <CategoryForm
          key={categoryDialogMode === 'create' ? 'create' : categoryDialogMode?._id ?? 'edit'}
          initialData={
            categoryDialogMode && typeof categoryDialogMode === 'object'
              ? { _id: categoryDialogMode._id, name: categoryDialogMode.name }
              : undefined
          }
          onSubmit={handleCategoryDialogSubmit}
          onCancel={() => setCategoryDialogMode(null)}
          submitLabel={categoryDialogMode === 'create' ? 'Create' : 'Update'}
          isSubmitting={
            categoryDialogMode === 'create'
              ? createCategoryMutation.isPending
              : updateCategoryMutation.isPending
          }
        />
      </Dialog>
    </>
  );
}
