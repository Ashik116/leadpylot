'use client';

import ConfirmPopover from '@/components/shared/ConfirmPopover';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import RichTextEditor from '@/components/shared/RichTextEditor/RichTextEditor';
import Button from '@/components/ui/Button';
import { ApiTask } from '@/services/TaskService';
import {
  Check,
  MoreHorizontal,
  Pencil,
  Printer,
  Reply,
  Trash2,
  X
} from 'lucide-react';
import React from 'react';
import { CreateCustomFieldDropdown } from '../_dropdowns/custom-fields/CreateCustomFieldDropdown';
import { CustomFieldValueEditor } from '../_dropdowns/custom-fields/CustomFieldValueEditor';
import { CustomFieldsDropdown } from '../_dropdowns/custom-fields/CustomFieldsDropdown';
import { DatesDropdown } from '../_dropdowns/dates/DatesDropdown';
import { CreateLabelDropdown } from '../_dropdowns/labels/CreateLabelDropdown';
import { LabelsDropdown } from '../_dropdowns/labels/LabelsDropdown';
import { MemberProfileDropdown } from '../_dropdowns/members/MemberProfileDropdown';
import { useCardDetailsLeftPanel } from '../_hooks/useCardDetailsLeftPanel';
import { useTaskOperations } from '../_hooks/useTaskOperations';
import {
  Attachment,
  CardDates,
  Checklist as ChecklistType,
  CustomFieldDefinition,
  CustomFieldValue,
  Label,
} from '../types';
import { ActionButtons } from './ActionButtons';
import { Checklist } from './ChecklistComponents';
import { EditableTitle } from './EditableTitle';
import {
  CustomFieldSection,
  InlineDateField,
  InlineLabelField,
  InlineMemberField,
  InlineNumberField,
  InlineSelectField,
} from './CustomFieldComponents';
import { DateDisplay } from './DateComponents';
import { LabelBadge } from './LabelComponents';
import { MemberAvatarGroup } from './MemberComponents/MemberAvatarGroup';
import { UnifiedMemberAssignment } from './MemberComponents/UnifiedMemberAssignment';
import Image from 'next/image';
import DocumentsSectionTable from '@/app/(protected-pages)/dashboards/mails/_components/EmailDetail/DocumentsSectionTable';

// ============================================================================
// Helper Components
// ============================================================================
 

const HeaderIcon = ({ icon, small }: { icon: React.ReactNode; small?: boolean }) => (
  <button
    className={`${small ? 'p-1.5' : 'p-2'} hover:bg-ocean-2/50 rounded-lg text-black/80 transition-all hover:text-black`}
  >
    {icon}
  </button>
);

// ============================================================================
// Main Component
// ============================================================================

interface CardDetailsLeftPanelProps {
  task: ApiTask; // Use API format directly
  description: string;
  onDescriptionChange: (description: string) => void;
  taskLabelObjects: Label[];
  taskMembers: string[];
  taskDates?: CardDates;
  checklists: ChecklistType[]; // Transformed for UI display
  taskCustomFields: CustomFieldValue[]; // Transformed for UI display
  customFields: CustomFieldDefinition[];
  attachments: Attachment[]; // Transformed for UI display
  operations: ReturnType<typeof useTaskOperations>;
  onRefetch: () => void;
  hideBoardFeatures?: boolean;
  bodyClassName?: string;
}

export const CardDetailsLeftPanel: React.FC<CardDetailsLeftPanelProps> = ({
  task,
  description,
  taskLabelObjects,
  taskMembers,
  onDescriptionChange,
  taskDates,
  checklists,
  taskCustomFields,
  customFields,
  attachments,
  operations,
  onRefetch,
  hideBoardFeatures = false,
  bodyClassName = ""
}) => {
  const {
    updateTask,
    documentPreview,
    currentCustomFields,
    displayMembers,
    removeCustomFieldValue,
    labelsDropdown,
    dateDisplayRef,
    labelsSectionRef,
    labelsTextRef,
    membersSectionRef,
    setDatesDropdownOpen,
    setMembersDropdownOpen,
    selectedMemberForProfile,
    editingField,
    isEditingDescription,
    editingDescriptionContent,
    taskTitleValue,
    topRowFields,
    descriptionFields,
    sectionFields,
    setCustomFieldValue,
    handleStartEditDescription,
    handleSaveDescription,
    handleCancelDescription,
    handleDescriptionChange,
    actionButtonsProps,
    checklistPropsFor,
    customFieldSectionPropsFor,
    datesDropdownProps,
    labelsDropdownProps,
    createLabelDropdownKey,
    createLabelDropdownProps,
    memberAssignmentProps,
    memberProfileDropdownProps,
    customFieldsDropdownProps,
    createCustomFieldDropdownProps,
    customFieldValueEditorProps,
    attachmentDocuments,
  } = useCardDetailsLeftPanel({
    task,
    description,
    onDescriptionChange,
    taskMembers,
    taskDates,
    checklists,
    taskCustomFields,
    customFields,
    attachments,
    operations,
    onRefetch,
    hideBoardFeatures,
  });

  return (
    <div className={`custom-scrollbar border-ocean-2/50 flex-1 overflow-y-auto border-r bg-gray-100 p-2 ${bodyClassName}`}>
      {/* Lead Title & Basic Metadata */}
      <div className="mb-3">
        <EditableTitle
          value={taskTitleValue}
          onSave={async (newValue) => {
            if (task?._id && newValue !== (task?.taskTitle || '')) {
              await updateTask({ id: task._id, data: { taskTitle: newValue } });
            }
          }}
          placeholder="Lead Title"
          className="mb-2"
          inputClassName="text-xl font-extrabold tracking-tight text-black"
          showFullTitle
        />

        {/* Action Buttons */}
        <div className="mb-1.5">
          <ActionButtons {...actionButtonsProps} />
        </div>

        {/* Labels, Members, Dates, and Custom Fields in One Row */}

        {/* First Row: Labels, Members, Dates */}
        <div className="mb-2 flex flex-wrap items-start gap-3">
          {/* Labels Section */}
          {taskLabelObjects.length > 0 && !hideBoardFeatures && (
            <div className="flex flex-col gap-1" ref={labelsSectionRef}>
              <span
                ref={labelsTextRef}
                onClick={labelsDropdown.openLabelsDropdown}
                className="cursor-pointer text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase transition-colors hover:text-black"
              >
                Labels
              </span>
              <div
                className="flex flex-wrap items-center gap-2"
                onClick={labelsDropdown.openLabelsDropdown}
                role="button"
              >
                {taskLabelObjects.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      labelsDropdown.openLabelsDropdown();
                    }}
                    className="cursor-pointer"
                  >
                    <LabelBadge label={label} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Members Section */}
          {displayMembers.length > 0 && !hideBoardFeatures && (
            <div className="flex flex-col gap-1" ref={membersSectionRef}>
              <span
                onClick={() => setMembersDropdownOpen(true)}
                className="cursor-pointer text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase transition-colors hover:text-black"
              >
                Members
              </span>
              <MemberAvatarGroup
                members={displayMembers}
                maxCount={5}
                size={26}
                onOmittedAvatarClick={() => setMembersDropdownOpen(true)}
                className="cursor-pointer"
              />
            </div>
          )}

          {/* Dates Section */}
          {taskDates && (taskDates.dueDate || taskDates.startDate) && (
            <div className="flex flex-col gap-1" ref={dateDisplayRef}>
              <span className="text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase">
                Due date
              </span>
              <DateDisplay dates={taskDates} onClick={() => setDatesDropdownOpen(true)} />
            </div>
          )}
        </div>

        {/* Second Row: Custom Fields (excluding text) */}
        {(currentCustomFields.some((f) => ['number', 'select', 'date'].includes(f.field_type)) ||
          topRowFields.some((f) => ['member', 'label'].includes(f.field_type))) && (
            <div className="mb-2 flex flex-wrap items-start gap-3">
              {/* Number Fields */}
              {currentCustomFields
                .filter((f) => f.field_type === 'number')
                .map((field) => {
                  const fieldId = field._id || field.field_id;
                  return (
                    <div key={fieldId || field.title} className="flex flex-col gap-1 group/num">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase">
                          {field.title}
                        </span>
                        {!hideBoardFeatures && (
                          <ConfirmPopover
                            title="Remove field"
                            description="Remove this custom field from the task? You can add it again from Custom Fields."
                            confirmText="Remove"
                            onConfirm={() => removeCustomFieldValue(fieldId)}
                            placement="top"
                          >
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover/num:opacity-100"
                              title="Remove field from task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </ConfirmPopover>
                        )}
                      </div>
                      <InlineNumberField
                        taskId={task._id || task.id}
                        field={field}
                        field_type={field.field_type}
                        hideLabel={true}
                      />
                    </div>
                  );
                })}

              {/* Select Fields */}
              {!hideBoardFeatures && currentCustomFields
                .filter((f) => f.field_type === 'select')
                .map((field) => {
                  const fieldId = field._id || field.field_id;
                  return (
                    <div key={fieldId || field.title} className="flex flex-col gap-1 group/sel">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase">
                          {field.title}
                        </span>
                        <ConfirmPopover
                          title="Remove field"
                          description="Remove this custom field from the task? You can add it again from Custom Fields."
                          confirmText="Remove"
                          onConfirm={() => removeCustomFieldValue(fieldId)}
                          placement="top"
                        >
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover/sel:opacity-100"
                            title="Remove field from task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </ConfirmPopover>
                      </div>
                      <InlineSelectField
                        taskId={task._id || task.id}
                        field={field}
                        allCustomFields={currentCustomFields}
                        hideLabel={true}
                      />
                    </div>
                  );
                })}

              {/* Date Fields */}
              {!hideBoardFeatures && currentCustomFields
                .filter((f) => f.field_type === 'date')
                .map((fieldDef) => {
                  const fieldId = fieldDef._id || fieldDef.field_id;
                  const fieldValue = taskCustomFields.find((fv) => fv.fieldId === fieldId);
                  if (!fieldValue) return null;
                  const defForDate = { ...fieldDef, id: fieldId };
                  return (
                    <div key={fieldId} className="flex flex-col gap-1 group/date">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase">
                          {fieldDef.title || 'Untitled'}
                        </span>
                        <ConfirmPopover
                          title="Remove field"
                          description="Remove this custom field from the task? You can add it again from Custom Fields."
                          confirmText="Remove"
                          onConfirm={() => removeCustomFieldValue(fieldId)}
                          placement="top"
                        >
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover/date:opacity-100"
                            title="Remove field from task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </ConfirmPopover>
                      </div>
                      <InlineDateField
                        fieldDefinition={defForDate}
                        fieldValue={fieldValue}
                        onUpdate={(value) => setCustomFieldValue(fieldId, value)}
                        hideLabel={true}
                      />
                    </div>
                  );
                })}

              {/* Member Fields */}
              {!hideBoardFeatures && topRowFields
                .filter((f) => f.field_type === 'member')
                .map((fieldDef) => {
                  const fieldValue = taskCustomFields.find((fv) => fv.fieldId === fieldDef.id);
                  if (!fieldValue) return null;
                  return (
                    <div key={fieldDef.id} className="flex flex-col gap-1 group/mem">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase">
                          {fieldDef.title || 'Untitled'}
                        </span>
                        <ConfirmPopover
                          title="Remove field"
                          description="Remove this custom field from the task? You can add it again from Custom Fields."
                          confirmText="Remove"
                          onConfirm={() => removeCustomFieldValue(fieldDef.id)}
                          placement="top"
                        >
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover/mem:opacity-100"
                            title="Remove field from task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </ConfirmPopover>
                      </div>
                      <InlineMemberField
                        fieldDefinition={fieldDef}
                        fieldValue={fieldValue}
                        onUpdate={(value) => setCustomFieldValue(fieldDef.id, value)}
                        taskId={task._id || task.id}
                        hideLabel={true}
                      />
                    </div>
                  );
                })}

              {/* Label Fields */}
              {!hideBoardFeatures && topRowFields
                .filter((f) => f.field_type === 'label')
                .map((fieldDef) => {
                  const fieldValue = taskCustomFields.find((fv) => fv.fieldId === fieldDef.id);
                  if (!fieldValue) return null;
                  return (
                    <div key={fieldDef.id} className="flex flex-col gap-1 group/lbl">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase">
                          {fieldDef.title || 'Untitled'}
                        </span>
                        <ConfirmPopover
                          title="Remove field"
                          description="Remove this custom field from the task? You can add it again from Custom Fields."
                          confirmText="Remove"
                          onConfirm={() => removeCustomFieldValue(fieldDef.id)}
                          placement="top"
                        >
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover/lbl:opacity-100"
                            title="Remove field from task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </ConfirmPopover>
                      </div>
                      <InlineLabelField
                        fieldDefinition={fieldDef}
                        fieldValue={fieldValue}
                        onUpdate={(value) => setCustomFieldValue(fieldDef.id, value)}
                        taskId={task._id || task.id}
                        hideLabel={true}
                      />
                    </div>
                  );
                })}
            </div>
          )}

        {/* Third Row: Text Fields */}
        {!hideBoardFeatures && currentCustomFields.some((f) => f.field_type === 'text') && (
          <div className="mb-2 flex flex-wrap items-start gap-3">
            {currentCustomFields
              .filter((f) => f.field_type === 'text')
              .map((field) => {
                const fieldValue = taskCustomFields.find((fv) => fv.fieldId === field._id);
                return (
                  <div key={field._id || field.title} className="flex flex-col gap-1">
                    <span className="text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase">
                      {field.title}
                    </span>
                    <InlineNumberField
                      taskId={task._id || task.id}
                      field={field}
                      field_type={field.field_type}
                      hideLabel={true}
                      showEditButton={!!fieldValue?.value}
                    />
                  </div>
                );
              })}
          </div>
        )}
      </div>


      {/* Description Field */}
      <div className="mb-2">
        <p className="pb-1 text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase">
          Description
        </p>

        {/* View Mode: Show rendered HTML with Edit button */}
        {!isEditingDescription && description && description.trim() !== '' && (
          <div className="group relative">
            <div
              className="prose prose-sm border-ocean-2/50 max-w-none rounded-lg border bg-white p-3 text-sm text-black/80 overflow-auto"
              dangerouslySetInnerHTML={{ __html: description }}
            />
            <button
              onClick={handleStartEditDescription}
              className="border-ocean-2/50 absolute top-2 right-2 flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-xs font-medium text-black opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
          </div>
        )}

        {/* Edit Mode: Show RichTextEditor with Save/Cancel buttons */}
        {(isEditingDescription || !description || description.trim() === '') && (
          <div className="space-y-1.5">
            <RichTextEditor
              content={isEditingDescription ? editingDescriptionContent : description || ''}
              placeholder="Add a description..."
              onChange={handleDescriptionChange}
              editorContentClass="min-h-[120px] text-sm"
            />
            {/* Show Save/Cancel buttons when in edit mode (clicked Edit) or when typing (content has changed) */}
            {isEditingDescription && (
              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={handleCancelDescription}
                  size="xs"
                  icon={<X className="h-4 w-4" />}
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  onClick={handleSaveDescription}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                  icon={<Check className="h-4 w-4" />}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TEXT, TEXTAREA, and TODO CUSTOM FIELDS - Below Description */}
      {descriptionFields.length > 0 && (
        <div className="mb-3 space-y-2">
          {descriptionFields.map((fieldDef) => {
            const fieldValue = taskCustomFields.find((fv) => fv.fieldId === fieldDef.id);
            if (!fieldValue) return null;
            return (
              <CustomFieldSection
                key={fieldDef.id}
                {...customFieldSectionPropsFor(fieldDef, fieldValue)}
              />
            );
          })}
        </div>
      )}

      {/* CHECKLISTS */}
      {checklists && checklists.length > 0 && !hideBoardFeatures && (
        <div className="mb-3 space-y-2">
          <p className="pb-1 text-xs font-bold tracking-widest whitespace-nowrap text-black/80 uppercase">
          Todos
        </p>
          {checklists.map((checklist) => (
            <Checklist key={checklist.id} {...checklistPropsFor(checklist)} />
          ))}
        </div>
      )}

      {/* CUSTOM FIELDS */}
      {sectionFields.length > 0 && !hideBoardFeatures && (
        <div className="mb-3 space-y-2">
          {sectionFields.map((fieldDef) => {
            const fieldValue = taskCustomFields.find((fv) => fv.fieldId === fieldDef.id);
            if (!fieldValue) return null;
            return (
              <CustomFieldSection
                key={fieldDef.id}
                {...customFieldSectionPropsFor(fieldDef, fieldValue)}
              />
            );
          })}
        </div>
      )}

      {/* EMAIL HISTORY (THREAD VIEW) */}
      <div className="space-y-2">
        {((task as any).emails || []).map((email: any, idx: number) => (
          <div
            key={email.id}
            className={`relative rounded-2xl border p-2 transition-all ${idx === ((task as any).emails || []).length - 1 ? 'border-ocean-2/50 ring-ocean-2/50 bg-gray-100 ring-1' : 'border-ocean-2/50 bg-gray-100 opacity-80'}`}
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="border-ocean-2/50 bg-ocean-2/50 flex h-10 w-10 items-center justify-center rounded-xl border p-2">
                  <Image src={email.logo} alt="Logo" className="h-full w-full object-contain" width={40} height={40} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-black">{email.from}</span>
                    <span className="text-[11px] text-black/80">({email.fromEmail})</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-black/80">to {email.to}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-black/80">
                <span className="text-[11px] font-medium">{email.date}</span>
                <div className="flex gap-1">
                  <HeaderIcon icon={<Printer className="h-3.5 w-3.5" />} small />
                  <HeaderIcon icon={<Reply className="h-3.5 w-3.5" />} small />
                  <HeaderIcon icon={<MoreHorizontal className="h-3.5 w-3.5" />} small />
                </div>
              </div>
            </div>
            <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-black/80">
              {email.body}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="bg-ocean-2/50 h-px flex-1"></div>
              <button className="text-xxs font-bold tracking-widest text-indigo-400 uppercase transition-colors hover:text-white">
                Show full message
              </button>
              <div className="bg-ocean-2/50 h-px flex-1"></div>
            </div>
          </div>
        ))}

        {/* Attachments Section */}
        {attachments && attachments.length > 0 && (
          <>
            <div className="mt-2 flex items-center gap-2">
              <div className="bg-ocean-2/50 h-px flex-1"></div>
              <p className="text-xs font-bold text-gray-600">
                ATTACHMENTS (<span className="text-evergreen text-base">{attachments.length}</span>)
              </p>
              <div className="bg-ocean-2/50 h-px flex-1"></div>
            </div>
            <DocumentsSectionTable documents={attachmentDocuments} />
          </>
        )}

      </div>

      {/* Dates Dropdown */}
      <DatesDropdown {...datesDropdownProps} />

      {/* Labels Dropdown */}
      <LabelsDropdown {...labelsDropdownProps} />

      {/* Create/Edit Label Dropdown */}
      <CreateLabelDropdown key={createLabelDropdownKey} {...createLabelDropdownProps} />

      {/* Members Dropdown */}
      <UnifiedMemberAssignment {...memberAssignmentProps} />

      {/* Member Profile Dropdown */}
      {selectedMemberForProfile && !hideBoardFeatures && memberProfileDropdownProps && (
        <MemberProfileDropdown {...memberProfileDropdownProps} />
      )}

      {/* Custom Fields Dropdown */}
      {!hideBoardFeatures && <CustomFieldsDropdown {...customFieldsDropdownProps} />}

      {/* Create/Edit Custom Field Dropdown */}
      {!hideBoardFeatures && <CreateCustomFieldDropdown {...createCustomFieldDropdownProps} />}

      {/* Custom Field Value Editor */}
      {editingField && !hideBoardFeatures && customFieldValueEditorProps && (
        <CustomFieldValueEditor {...customFieldValueEditorProps} />
      )}

      {/* Document Preview Dialog */}
      {!hideBoardFeatures && <DocumentPreviewDialog {...documentPreview.dialogProps} title="Document Preview" />}
    </div>
  );
};
