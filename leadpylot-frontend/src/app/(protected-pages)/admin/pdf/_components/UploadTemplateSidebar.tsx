'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { usePdfTemplate, useUpdateTemplate, useUploadTemplate } from '@/services/hooks/usePdfTemplates';
import { FontSelector } from '@/components/shared/FontManagement';
import { useProjects } from '@/services/hooks/useProjects';
import { useSources } from '@/services/hooks/useSources';
import { Controller, useForm } from 'react-hook-form';
import FloatingSelect, { type FloatingSelectOption } from '@/components/template/Notification/_components/FloatingSelect';

const categories = ['offer', 'contract', 'application', 'other'] as const;
const offerTypes = ['festgeld', 'tagesgeld', 'etf'];

interface UploadTemplateSidebarProps {
  isOpen: boolean;
  onClose: (updatedTemplate?: { _id: string; name: string }) => void;
  renderInSidebar?: boolean;
  pdfId?: string;
  header?: boolean;
}
type FormValues = {
  selectedFile: File | null;
  name: string;
  description: string;
  category: '' | typeof categories[number];
  tags: string;
  team_id: string;
  lead_source: string[];
  defaultFont: string | null;
  autoFlatten: boolean;
  allowEditing: boolean;
  offer_type: '' | (typeof offerTypes)[number];
};

export default function UploadTemplateSidebar({ isOpen, onClose, renderInSidebar = false, pdfId, header = true }: UploadTemplateSidebarProps) {

  const { data: template, isLoading: isTemplateLoading } = usePdfTemplate(pdfId || '');
  const updateTemplateMutation = useUpdateTemplate();
  const DEFAULT_VALUES = useMemo<FormValues>(() => ({
    selectedFile: null,
    name: '',
    description: '',
    category: '',
    tags: '',
    team_id: '',
    lead_source: [],
    defaultFont: null,
    autoFlatten: true,
    allowEditing: false,
    offer_type: '',
  }), []);

  const { register, control, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const [formKey, setFormKey] = useState(0);
  // Prefill when editing
  useEffect(() => {
    if (pdfId && template?.data) {
      const { name, description, category, tags, team_id, settings, offer_type, lead_source } = template.data as any;
      reset({
        selectedFile: null,
        name: name || '',
        description: description || '',
        category: category || '',
        tags: Array.isArray(tags) ? (tags as string[]).join(', ') : '',
        team_id: team_id?._id || '',
        lead_source: Array.isArray(lead_source)
          ? lead_source.map((s: any) => s?._id || s).filter(Boolean)
          : [],
        defaultFont: settings?.default_font ?? null,
        autoFlatten: settings?.auto_flatten ?? true,
        allowEditing: settings?.allow_editing ?? false,
        offer_type: offer_type || '',

      }, { keepDirty: false, keepTouched: false, keepValues: false });
    } else {
      reset(DEFAULT_VALUES, { keepDirty: false, keepTouched: false, keepValues: false });
      setFormKey((k) => k + 1);
    }
  }, [pdfId, template, reset, DEFAULT_VALUES]);

  const { data: projects, isLoading } = useProjects({ limit: 100 });
  const { data: sourcesData, isLoading: isSourcesLoading } = useSources({ limit: 100 });
  const uploadMutation = useUploadTemplate();

  const handleFileChange = useCallback((file: File | null) => {
    if (file && file.type === 'application/pdf') {
      setValue('selectedFile', file);
      if (!watch('name')) setValue('name', file.name.replace(/\.pdf$/i, ''));
    } else {
      alert('Please select a PDF file');
    }
  }, [setValue, watch]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const onSubmit = useCallback(async (values: FormValues) => {

    try {
      if (pdfId) {
        const { name, offer_type, lead_source, team_id, tags, description, category, defaultFont, autoFlatten, allowEditing } = values;
        const updatePayload = {
          name,
          offer_type: offer_type || undefined,
          lead_source: lead_source.length > 0 ? lead_source : [],
          team_id: team_id || undefined,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          description,
          category,
          settings: {
            default_font: defaultFont || undefined,
            auto_flatten: autoFlatten,
            allow_editing: allowEditing,
            template_id: pdfId,
          },
        };
        const result = await updateTemplateMutation.mutateAsync({ templateId: pdfId, data: updatePayload });
        // if (defaultFont || autoFlatten || autoFlatten) {
        //   await updateTemplateSettingsMutation.mutateAsync({
        //     templateId: pdfId,
        //     settings: {
        //       default_font: defaultFont || undefined,
        //       auto_flatten: autoFlatten,
        //       allow_editing: allowEditing,
        //     },
        //   });
        // }
        // Pass updated template data to onClose callback
        const updatedTemplate = result?.data || { _id: pdfId, name: values.name };
        onClose(updatedTemplate);
      } else {
        // Create new template via upload
        if (!values.selectedFile) {
          alert('Please select a PDF file');
          return;
        }
        const formData = new FormData();
        formData.append('template', values.selectedFile);
        if (values.name) formData.append('name', values.name);
        if (values.description) formData.append('description', values.description);
        formData.append('category', values.category);
        if (values.team_id) formData.append('team_id', values.team_id);
        if (values.offer_type) formData.append('offer_type', values.offer_type as any);
        if (values.lead_source.length > 0) formData.append('lead_source', JSON.stringify(values.lead_source));
        if (values.tags) {
          formData.append('tags', JSON.stringify(
            values.tags.split(',').map((t) => t.trim()).filter(Boolean)
          ));
        }
        formData.append('settings', JSON.stringify({
          default_font: values.defaultFont,
          auto_flatten: values.autoFlatten,
          allow_editing: values.allowEditing,
          font_size_adjustment: true,
        }));

        const uploadResult = await uploadMutation.mutateAsync(formData);
        // After creating, show a fresh form (keep sidebar open)
        reset(DEFAULT_VALUES, { keepDirty: false, keepTouched: false, keepValues: false });
        setFormKey((k) => k + 1);
        // Pass new template data to onClose callback
        const newTemplate = uploadResult?.data || { _id: uploadResult?.data?.template?._id || '', name: values.name };
        onClose(newTemplate as unknown as { _id: string; name: string });
      }
    } catch { }
  }, [pdfId, updateTemplateMutation, uploadMutation, reset, DEFAULT_VALUES, onClose]);
  const handleFileRemove = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setValue('selectedFile', null);
  }

  const categoryValue = watch('category');
  const isOffer = categoryValue === 'offer';

  const form = (
    <form key={formKey} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Header */}
      {header && (
        <div className="flex items-start justify-between border-b pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <ApolloIcon name={pdfId ? 'file' : 'upload'} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{pdfId ? 'Edit PDF Template' : 'Upload PDF Template'}</h3>
              <p className="text-sm text-gray-500">{pdfId ? 'Update template details' : 'Add a new template to your collection'}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={handleClose}
            icon={<ApolloIcon name="cross" />}
          >
          </Button>
        </div>
      )}

      {/* File Upload (create only) */}
      {!pdfId && (
        <Controller
          control={control}
          name="selectedFile"
          render={() => (
            <FileUpload
              selectedFile={watch('selectedFile')}
              onFileSelect={(file: File | null) => handleFileChange(file)}
              onFileRemove={handleFileRemove}
            />
          )}
        />
      )}

      <InputField label="Template Name" {...register('name')} />


      {/* Product & Tags */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="team_id"
          rules={{ required: !pdfId }}
          render={({ field }) => (
            <SelectField
              label="Project"
              value={field.value}
              options={(Array.isArray(projects) ? projects : projects?.data || []).map((p: any) => ({ label: p.name, value: p._id }))}
              onChange={field.onChange}
              fallbackLabel={isLoading ? 'Loading projects…' : 'Select a project'}
            />
          )}
        />
        <InputField label="Tags" placeholder="standard, investment" {...register('tags')} />
      </div>
      {/* Category & Offer Type */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="category"
          rules={{ required: true }}
          render={({ field }) => (
            <SelectField
              label="Category"
              value={field.value}
              options={categories.map((c) => ({ label: c, value: c }))}
              onChange={(val) => {
                field.onChange(val);
                if (val !== 'offer') setValue('offer_type', '');
              }}
              fallbackLabel="Select a category"
            />
          )}
        />
        {isOffer && (
          <Controller
            control={control}
            name="offer_type"
            rules={{ required: isOffer }}
            render={({ field }) => (
              <SelectField
                label="Offer Type"
                value={field.value}
                options={offerTypes.map((o) => ({ label: o, value: o }))}
                onChange={field.onChange}
                fallbackLabel="Select an offer type"
              />
            )}
          />
        )}
      </div>
      {/* Lead Sources (multi-select) */}
      {isOffer && (
        <Controller
          control={control}
          name="lead_source"
          render={({ field }) => {
            const sources = Array.isArray(sourcesData?.data) ? sourcesData.data : [];
            const selected: string[] = Array.isArray(field.value) ? field.value : [];
            const toggle = (id: string) => {
              const next = selected.includes(id)
                ? selected.filter((s) => s !== id)
                : [...selected, id];
              field.onChange(next);
            };
            return (
              <div className="space-y-1">
                <label className="block text-sm font-medium">Lead Sources <span className="text-xs text-gray-400">(optional)</span></label>
                {isSourcesLoading ? (
                  <p className="text-xs text-gray-400">Loading sources…</p>
                ) : sources.length === 0 ? (
                  <p className="text-xs text-gray-400">No sources found</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sources.map((s: any) => (
                      <label
                        key={s._id}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          selected.includes(s._id)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selected.includes(s._id)}
                          onChange={() => toggle(s._id)}
                        />
                        {selected.includes(s._id) && <span>✓</span>}
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
                {selected.length === 0 && (
                  <p className="text-xs text-gray-400">No sources selected = matches all sources</p>
                )}
              </div>
            );
          }}
        />
      )}

      {/* Description */}
      <TextAreaField label="Description" {...register('description')} />

      {/* Template Settings */}
      <div className="space-y-4 rounded-xl border bg-gray-50 p-4">
        <h4 className="font-medium">🎨 Template Settings <span className="text-sm text-gray-500">(Optional)</span></h4>
        <div>
          <label className="block text-sm mb-1">Default Font</label>
          <Controller
            control={control}
            name="defaultFont"
            render={({ field }) => (
              <FontSelector value={field.value} onChange={(fontFamily) => field.onChange(fontFamily)} placeholder="Auto (PDF default font)" />
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckboxField label="Auto Flatten" subText="Remove form fields after filling" {...register('autoFlatten')} />
          <CheckboxField label="Allow Editing" subText="Keep fields editable" {...register('allowEditing')} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={handleClose} disabled={uploadMutation.isPending}>Cancel</Button>
        <Button
          type="submit"
          variant="success"
          disabled={(pdfId ? updateTemplateMutation.isPending : (!watch('selectedFile'))) || uploadMutation.isPending}
          loading={uploadMutation.isPending || updateTemplateMutation.isPending}
          icon={<ApolloIcon name={pdfId ? 'check-circle' : 'upload'} className="h-4 w-4" />}
        >
          {pdfId
            ? (updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes')
            : (uploadMutation.isPending ? 'Uploading...' : 'Upload Template')}
        </Button>
      </div>
    </form>
  );

  if (renderInSidebar) {
    return <div className="p-2">{form}</div>;
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      {isTemplateLoading && pdfId ? (
        <div className="p-6 text-sm text-gray-500">Loading template...</div>
      ) : form}
    </Dialog>
  );
}

/* ---------- Small UI helpers ---------- */
const InputField = ({ label, ...props }: any) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium">{label}</label>
    <Input className="w-full" {...props} />
  </div>
);

const TextAreaField = ({ label, ...props }: any) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium">{label}</label>
    <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} {...props} />
  </div>
);

const SelectField = ({ label, value, options, onChange, fallbackLabel }: {
  label: string;
  value: string;
  options: FloatingSelectOption[];
  onChange: (value: string) => void;
  fallbackLabel?: string;
}) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium">{label}</label>
    <FloatingSelect
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel={label}
      fallbackLabel={fallbackLabel}
      block
      size="md"
      rounded="!rounded-lg"
    />
  </div>
);

const CheckboxField = ({ label, subText, ...props }: any) => (
  <label className="flex items-start gap-2 text-sm">
    <input type="checkbox" className="mt-1 rounded border-gray-300" {...props} />
    <div>
      <div>{label}</div>
      {subText && <p className="text-xs text-gray-500">{subText}</p>}
    </div>
  </label>
);

const FileUpload = ({ selectedFile, onFileSelect, onFileRemove }: any) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileSelect?.(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please drop a PDF file');
      return;
    }
    onFileSelect?.(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">PDF File *</label>
      <input type="file" accept=".pdf" onChange={handleInputChange} className="hidden" id="pdf-upload" />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border p-6 text-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-dashed hover:bg-gray-50'
          }`}
      >
        {selectedFile && <div className='absolute top-0 right-0 bg-rust rounded-full w-5 h-5 flex items-center justify-center'>
          <ApolloIcon name="cross" className="text-white cursor-pointer text-sm" onClick={onFileRemove} />
        </div>}
        <label htmlFor="pdf-upload" className="block cursor-pointer">
          {selectedFile ? (
            <div className="space-y-1 flex flex-col items-center justify-center">
              <ApolloIcon name="file" className="mx-auto text-green-600" />
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="space-y-1 flex flex-col items-center justify-center">
              <ApolloIcon name="upload" className="mx-auto text-blue-600 text-2xl" />
              <p className="text-sm">Click to upload PDF or drag & drop here</p>
              <p className="text-xs text-gray-500">Only .pdf files are accepted</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};
