import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { useUpdateTask } from '@/hooks/useTasks';
import { ApiTask } from '@/services/TaskService';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import { calculateChecklistProgress } from '../_data/checklists-data';
import {
  createCustomField,
  getCustomFieldsByIds,
  updateCustomField,
} from '../_data/custom-fields-data';
import { createLabel, updateLabel as updateLabelData } from '../_data/labels-data';
import { useLabelsDropdown } from '../_hooks/useLabelsDropdown';
import { useTaskOperations } from '../_hooks/useTaskOperations';
import {
  Attachment,
  CardDates,
  ChecklistItem,
  Checklist as ChecklistType,
  CustomFieldDefinition,
  CustomFieldValue,
  Member,
  ReminderOption,
} from '../types';

interface UseCardDetailsLeftPanelParams {
  task: ApiTask;
  description: string;
  onDescriptionChange: (description: string) => void;
  taskMembers: string[];
  taskDates?: CardDates;
  checklists: ChecklistType[];
  taskCustomFields: CustomFieldValue[];
  customFields: CustomFieldDefinition[];
  attachments: Attachment[];
  operations: ReturnType<typeof useTaskOperations>;
  onRefetch: () => void;
  hideBoardFeatures?: boolean;
}

export const useCardDetailsLeftPanel = ({
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
  hideBoardFeatures = false,
}: UseCardDetailsLeftPanelParams) => {
  const { mutate: updateTask } = useUpdateTask();
  const documentPreview = useDocumentPreview();

  // Get API format data from task (must be before operations that use them)
  const currentSubTasks = useMemo(() => task.subTask || [], [task.subTask]);
  const currentCustomFields = useMemo(() => task.custom_fields || [], [task.custom_fields]);
  const currentLabels = useMemo(() => task.labels || [], [task.labels]);
  const currentAssigned = useMemo(() => task.assigned || [], [task.assigned]);
  const currentAttachments = useMemo(() => task.attachment || [], [task.attachment]);

  // Extract all member IDs from subTasks (checklists and checklist items) for task-level validation
  const subTaskMemberIds = useMemo(() => {
    const allSubTaskMemberIds: string[] = [];

    if (currentSubTasks && Array.isArray(currentSubTasks)) {
      currentSubTasks.forEach((st: any) => {
        // Extract checklist-level assigned members
        if (st.assigned) {
          if (typeof st.assigned === 'string') {
            allSubTaskMemberIds.push(st.assigned);
          } else if (Array.isArray(st.assigned)) {
            st.assigned.forEach((m: any) => {
              const id = typeof m === 'string' ? m : m?._id || m?.id;
              if (id) allSubTaskMemberIds.push(id);
            });
          } else if (typeof st.assigned === 'object' && st.assigned._id) {
            allSubTaskMemberIds.push(st.assigned._id);
          }
        }

        // Extract checklist item-level assigned members
        if (st.todo && Array.isArray(st.todo)) {
          st.todo.forEach((todo: any) => {
            if (todo.assigned) {
              if (Array.isArray(todo.assigned)) {
                todo.assigned.forEach((m: any) => {
                  const id = typeof m === 'string' ? m : m?._id || m?.id;
                  if (id) allSubTaskMemberIds.push(id);
                });
              } else if (typeof todo.assigned === 'string') {
                allSubTaskMemberIds.push(todo.assigned);
              } else if (typeof todo.assigned === 'object' && todo.assigned._id) {
                allSubTaskMemberIds.push(todo.assigned._id);
              }
            }
          });
        }
      });
    }

    return Array.from(new Set(allSubTaskMemberIds));
  }, [currentSubTasks]);

  // Transform currentAssigned to Member format for MemberAvatarGroup
  const displayMembers = useMemo(() => {
    return (currentAssigned || [])
      .map((member: any) => {
        const memberId = typeof member === 'string' ? member : member?._id || member?.id;
        const memberName = member?.login || member?.info?.name || member?.name || 'Unknown';
        return {
          id: memberId,
          name: memberName,
          login: member?.login,
          email: member?.info?.email || member?.email,
        };
      })
      .filter((m: any) => m.id);
  }, [currentAssigned]);

  // Helper functions
  const getCustomFieldDefinitions = useCallback((fieldIds: string[]): CustomFieldDefinition[] => {
    return getCustomFieldsByIds(fieldIds);
  }, []);

  // Labels operations - use API format (labels array of objects)
  const createNewLabel = useCallback((data: { name: string; color: string }) => {
    const newLabel = createLabel(data);
    return newLabel;
  }, []);

  const editLabel = useCallback((id: string, data: { name: string; color: string }) => {
    updateLabelData(id, data);
  }, []);

  // Members operations - use API format (assigned array of strings)
  const toggleMember = useCallback(
    async (memberId: string) => {
      await operations.toggleMember(memberId, currentAssigned);
      onRefetch();
    },
    [operations, currentAssigned, onRefetch]
  );

  // Dates operations
  const saveDates = useCallback(
    async (dates: CardDates) => {
      await operations.saveDates(dates);
      onRefetch();
    },
    [operations, onRefetch]
  );

  const removeDates = useCallback(async () => {
    await operations.removeDates();
    onRefetch();
  }, [operations, onRefetch]);

  // Checklists operations - use API format (subTask)
  const createChecklist = useCallback(
    async (checklistTitle: string, selectedTodoTypeIds?: string[]) => {
      const newChecklist = await operations.createChecklist(checklistTitle, selectedTodoTypeIds, currentSubTasks);
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
      return newChecklist;
    },
    [operations, currentSubTasks]
  );

  const updateChecklist = useCallback(async (id: string, updates: Partial<Omit<ChecklistType, 'id'>>) => {
    // console.log('updateChecklist', id, updates);
    await operations.updateChecklist(id, updates, currentSubTasks);
    // No manual refetch needed - useUpdateTask mutation already invalidates queries
  },
  [operations, currentSubTasks]
  );

  const toggleChecklistComplete = useCallback(
    async (id: string, isCompleted: boolean) => {
      await operations.updateChecklist(id, { isCompleted }, currentSubTasks);
    },
    [operations, currentSubTasks]
  );

  const deleteChecklist = useCallback(
    async (id: string) => {
      await operations.deleteChecklist(id, currentSubTasks);
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentSubTasks]
  );

  const addChecklistItem = useCallback(
    async (
      checklistId: string,
      text: string,
      metadata?: {
        assignedMembers?: string[];
        dueDate?: string;
        dueTime?: string;
        reminder?: ReminderOption;
      }
    ) => {
      const newItem = await operations.addChecklistItem(
        checklistId,
        text,
        metadata,
        currentSubTasks
      );
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
      return newItem;
    },
    [operations, currentSubTasks]
  );

  const updateChecklistItem = useCallback(
    async (checklistId: string, itemId: string, updates: Partial<Omit<ChecklistItem, 'id'>>) => {
      await operations.updateChecklistItem(checklistId, itemId, updates, currentSubTasks);
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentSubTasks]
  );

  const deleteChecklistItem = useCallback(
    async (checklistId: string, itemId: string) => {
      await operations.deleteChecklistItem(checklistId, itemId, currentSubTasks);
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentSubTasks]
  );

  const toggleChecklistItem = useCallback(
    async (checklistId: string, itemId: string) => {
      await operations.toggleChecklistItem(checklistId, itemId, currentSubTasks);
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentSubTasks]
  );

  const setChecklistItemDueDate = useCallback(
    async (
      checklistId: string,
      itemId: string,
      date?: string,
      time?: string,
      reminder?: ReminderOption
    ) => {
      await operations.updateChecklistItem(
        checklistId,
        itemId,
        {
          dueDate: date,
          dueTime: time,
          reminder: reminder || undefined,
        },
        currentSubTasks
      );
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentSubTasks]
  );

  const removeChecklistItemDueDate = useCallback(
    async (checklistId: string, itemId: string) => {
      await operations.updateChecklistItem(
        checklistId,
        itemId,
        {
          dueDate: undefined,
          dueTime: undefined,
          reminder: undefined,
        },
        currentSubTasks
      );
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentSubTasks]
  );

  const assignChecklistMembers = useCallback(
    async (checklistId: string, itemId: string, memberIds: string[]) => {
      await operations.updateChecklistItem(
        checklistId,
        itemId,
        { assignedMembers: memberIds },
        currentSubTasks
      );
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentSubTasks]
  );

  // Checklist-level handlers
  const assignChecklist = useCallback(
    async (checklistId: string, memberIds: string[]) => {
      await operations.updateChecklist(
        checklistId,
        { assignedMembers: memberIds },
        currentSubTasks
      );
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentSubTasks]
  );

  const setChecklistDueDate = useCallback(
    async (checklistId: string, date?: string, time?: string) => {
      await operations.updateChecklist(
        checklistId,
        { dueDate: date, dueTime: time },
        currentSubTasks
      );
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentSubTasks]
  );

  const getChecklistProgress = useCallback(
    (checklistId: string): number => {
      const checklist = checklists.find((c) => c.id === checklistId);
      if (!checklist) return 0;
      return calculateChecklistProgress(checklist.items);
    },
    [checklists]
  );

  // Custom Fields operations
  const createCustomFieldFn = useCallback(
    (data: Omit<CustomFieldDefinition, 'id' | 'createdAt'>): CustomFieldDefinition => {
      const newField = createCustomField(data);
      // Refresh custom fields list - in a real app, this would refetch from API
      return newField;
    },
    []
  );

  const updateCustomFieldDef = useCallback(
    (id: string, data: Partial<Omit<CustomFieldDefinition, 'id' | 'createdAt'>>) => {
      updateCustomField(id, data);
      // Refresh custom fields list - in a real app, this would refetch from API
    },
    []
  );

  // const deleteCustomFieldDef = useCallback((id: string) => {
  //   deleteCustomField(id);
  //   // Refresh custom fields list - in a real app, this would refetch from API
  // }, []);

  const removeCustomFieldValue = useCallback(
    async (fieldId: string) => {
      await operations.removeCustomFieldValue(fieldId, currentCustomFields);
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, currentCustomFields]
  );

  const toggleCustomFieldOnTask = useCallback(
    async (fieldId: string) => {
      const fieldDef = customFields.find((f) => f.id === fieldId);
      let defaultValue: any = null;
      if (fieldDef) {
        if (fieldDef.defaultValue !== undefined) {
          defaultValue = fieldDef.defaultValue;
        } else if (fieldDef.field_type === 'checkbox') {
          defaultValue = false;
        } else if (fieldDef.field_type === 'number') {
          defaultValue = 0;
        } else if (fieldDef.field_type === 'select' && fieldDef.options?.length) {
          defaultValue = fieldDef.options[0];
        }
      }
      await operations.toggleCustomFieldOnTask(fieldId, currentCustomFields, defaultValue);
      onRefetch();
    },
    [operations, currentCustomFields, customFields, onRefetch]
  );

  // Attachments operations - use API format (attachment array)
  // Upload is now handled inside CompactFileUpload component
  // Delete is now handled inside AttachmentsSection component
  const handleUploadComplete = useCallback(() => {
    onRefetch();
  }, [onRefetch]);

  const handleDeleteComplete = useCallback(() => {
    onRefetch();
  }, [onRefetch]);

  const handlePreview = useCallback(
    (attachment: Attachment) => {
      const previewType = getDocumentPreviewType(attachment.type, attachment.filename);
      documentPreview.openPreview(
        attachment.id,
        attachment.filename,
        previewType as 'pdf' | 'image' | 'other'
      );
    },
    [documentPreview]
  );

  const downloadAttachment = useCallback(
    async (attachment: Attachment) => {
      // If document is already loaded in preview, use hook's download
      if (documentPreview.selectedDocumentId === attachment.id && documentPreview.previewUrl) {
        documentPreview.downloadDocument();
        return;
      }

      // Otherwise, fetch and download directly
      try {
        const { apiFetchDocument } = await import('@/services/DocumentService');
        const { downloadDocument } = await import('@/utils/documentUtils');
        const blob = await apiFetchDocument(attachment.id);
        downloadDocument(blob, attachment.filename, attachment.type);
      } catch (error) {
        console.error('Error downloading attachment:', error);
        // Fallback: try to use preview hook
        handlePreview(attachment);
        setTimeout(() => {
          if (documentPreview.selectedDocumentId === attachment.id) {
            documentPreview.downloadDocument();
          }
        }, 500);
      }
    },
    [documentPreview, handlePreview]
  );

  // Title and description handlers
  // const setTitle = useCallback(
  //   async (newTitle: string) => {
  //     onTitleChange(newTitle);
  //     await operations.updateTitle(newTitle);
  //     onRefetch();
  //   },
  //   [operations, onTitleChange, onRefetch]
  // );

  const setDescription = useCallback(
    async (newDesc: string) => {
      onDescriptionChange(newDesc);
      await operations.updateDescription(newDesc);
      onRefetch();
    },
    [operations, onDescriptionChange, onRefetch]
  );

  // Use shared hook for LabelsDropdown state management
  const labelsDropdown = useLabelsDropdown({
    createNewLabel,
    editLabel,
  });

  // Refs for dropdown positioning
  const dateDisplayRef = useRef<HTMLDivElement>(null);
  const labelsSectionRef = useRef<HTMLDivElement>(null);
  const labelsTextRef = useRef<HTMLSpanElement>(null); // Specific ref for "Labels" text for better dropdown positioning
  const membersSectionRef = useRef<HTMLDivElement>(null);
  const customFieldsSectionRef = useRef<HTMLDivElement>(null);

  // Dropdown states
  const [datesDropdownOpen, setDatesDropdownOpen] = useState(false);
  const [membersDropdownOpen, setMembersDropdownOpen] = useState(false);
  const [memberProfileDropdownOpen, setMemberProfileDropdownOpen] = useState(false);
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<Member | null>(null);
  const memberBadgeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [customFieldsDropdownOpen, setCustomFieldsDropdownOpen] = useState(false);
  const [createCustomFieldDropdownOpen, setCreateCustomFieldDropdownOpen] = useState(false);
  const [customFieldValueEditorOpen, setCustomFieldValueEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | undefined>();
  const [editingFieldId, setEditingFieldId] = useState<string>('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescriptionContent, setEditingDescriptionContent] = useState<string>('');
  // const [hasDescriptionChanges, setHasDescriptionChanges] = useState(false);
  const [taskTitleValue, setTaskTitleValue] = useState<string>('');

  // Create field definitions from API response (custom_fields contains both definition and value)
  // This ensures we have definitions even if they're not in the local store
  const apiFieldDefinitions = useMemo(() => {
    return (currentCustomFields || []).map((cf: any) => ({
      id: cf._id || cf.field_id || '',
      title: cf.title || '',
      field_type: cf.field_type || 'text',
      options: cf.options || [],
      defaultValue: cf.defaultValue,
      createdAt: cf.createdAt,
    }));
  }, [currentCustomFields]);

  // Custom field definitions for task - merge API definitions with local store definitions
  const customFieldDefinitions = useMemo(() => {
    const fieldIds = taskCustomFields.map((fv) => fv.fieldId);
    const localDefinitions = getCustomFieldDefinitions(fieldIds);

    // Create a map of local definitions by ID
    const localDefsMap = new Map(localDefinitions.map((def) => [def.id, def]));

    // Merge with API definitions, preferring local if available
    return apiFieldDefinitions.map((apiDef) => {
      const localDef = localDefsMap.get(apiDef.id);
      return localDef || apiDef;
    });
  }, [taskCustomFields, apiFieldDefinitions, getCustomFieldDefinitions]);

  // Separate fields for top row vs sections vs description fields
  const topRowFields = customFieldDefinitions.filter((field) => {
    const fieldValue = taskCustomFields.find((fv) => fv.fieldId === field.id);
    return fieldValue && ['number', 'select', 'date', 'member', 'label'].includes(field.field_type);
  });

  // Text, textarea, and todo fields to show below Description
  const descriptionFields = customFieldDefinitions.filter((field) => {
    const fieldValue = taskCustomFields.find((fv) => fv.fieldId === field.id);
    return fieldValue && ['text', 'textarea', 'todo'].includes(field.field_type);
  });

  // Other section fields (checkbox, etc.)
  const sectionFields = customFieldDefinitions.filter((field) => {
    const fieldValue = taskCustomFields.find((fv) => fv.fieldId === field.id);
    return (
      fieldValue &&
      !['number', 'select', 'date', 'member', 'label', 'text', 'textarea', 'todo'].includes(field.field_type)
    );
  });

  // Custom Fields operations - use API format (custom_fields array)
  // Redefine after customFieldDefinitions is available
  const setCustomFieldValue = useCallback(
    async (fieldId: string, value: any) => {
      // Find the field definition to check field_type
      const fieldDef = customFieldDefinitions.find((f) => f.id === fieldId);
      const fieldType = fieldDef?.field_type;

      // For todo fields, use 'todo' instead of 'value' in payload
      // Only send the updated field, not all fields
      const fieldToUpdate: any = { _id: fieldId };
      if (fieldType === 'todo') {
        // Check if this is a partial update (only changed todo) or full update
        if (value && typeof value === 'object' && value.changedTodo && value.allTodos) {
          // Partial update: only send the changed todo item
          const changedTodo = value.changedTodo;
          const cleanedTodo: any = {};

          // Use _id if available (from API), otherwise use id
          if (changedTodo._id) {
            cleanedTodo._id = changedTodo._id;
          } else if (changedTodo.id) {
            // Only keep id if it's a MongoDB ObjectId (24 hex chars), not a UUID
            if (typeof changedTodo.id === 'string' && changedTodo.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(changedTodo.id)) {
              cleanedTodo._id = changedTodo.id;
            }
            // If it's a UUID (36 chars with hyphens), don't include it - backend will generate _id
          }

          // Transform 'title' or 'text' to 'title'
          if (changedTodo.title) {
            cleanedTodo.title = changedTodo.title;
          } else if (changedTodo.text) {
            cleanedTodo.title = changedTodo.text;
          }

          // Transform 'completed' to 'isCompleted'
          const completed = changedTodo.completed !== undefined ? changedTodo.completed : (changedTodo.isCompleted !== undefined ? changedTodo.isCompleted : false);
          cleanedTodo.isCompleted = completed;

          // Include isDelete if set
          if (changedTodo.isDelete !== undefined) {
            cleanedTodo.isDelete = changedTodo.isDelete;
          }

          // Include assigned members (same format as checklist)
          if (changedTodo.assigned !== undefined) {
            // Normalize to array of string IDs
            if (Array.isArray(changedTodo.assigned)) {
              cleanedTodo.assigned = changedTodo.assigned.map((m: any) => {
                return typeof m === 'string' ? m : (m?._id || m?.id);
              }).filter(Boolean);
            } else if (changedTodo.assigned) {
              // Single value - convert to array
              const memberId = typeof changedTodo.assigned === 'string'
                ? changedTodo.assigned
                : (changedTodo.assigned?._id || changedTodo.assigned?.id);
              if (memberId) {
                cleanedTodo.assigned = [memberId];
              }
            } else {
              // Empty array if removing assignment
              cleanedTodo.assigned = [];
            }
          }

          // Include dueDate (same format as checklist - ISO string)
          if (changedTodo.dueDate !== undefined) {
            cleanedTodo.dueDate = changedTodo.dueDate || null;
          }

          // Include dueTime if provided
          if (changedTodo.dueTime !== undefined) {
            cleanedTodo.dueTime = changedTodo.dueTime || null;
          }

          // Remove frontend-specific fields
          delete cleanedTodo.id;
          delete cleanedTodo.text;
          delete cleanedTodo.completed;
          delete cleanedTodo._isChanged;
          delete cleanedTodo.assignedMembers; // Use 'assigned' instead

          // Only send the changed todo item
          fieldToUpdate.todo = [cleanedTodo];
        } else {
          // Full update: transform all todos (for initial load or bulk operations)
          const cleanedTodos = Array.isArray(value) ? value.map((todo: any) => {
            const cleanedTodo: any = {};

            // Use _id if available (from API), otherwise use id
            if (todo._id) {
              cleanedTodo._id = todo._id;
            } else if (todo.id) {
              // Only keep id if it's a MongoDB ObjectId (24 hex chars), not a UUID
              if (typeof todo.id === 'string' && todo.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(todo.id)) {
                cleanedTodo._id = todo.id;
              }
              // If it's a UUID (36 chars with hyphens), don't include it - backend will generate _id
            }

            // Transform 'title' or 'text' to 'title'
            if (todo.title) {
              cleanedTodo.title = todo.title;
            } else if (todo.text) {
              cleanedTodo.title = todo.text;
            }

            // Transform 'completed' to 'isCompleted'
            const completed = todo.completed !== undefined ? todo.completed : (todo.isCompleted !== undefined ? todo.isCompleted : false);
            cleanedTodo.isCompleted = completed;

            // Include isDelete if set
            if (todo.isDelete !== undefined) {
              cleanedTodo.isDelete = todo.isDelete;
            }

            // Include assigned members (same format as checklist)
            if (todo.assigned !== undefined) {
              // Normalize to array of string IDs
              if (Array.isArray(todo.assigned)) {
                cleanedTodo.assigned = todo.assigned.map((m: any) => {
                  return typeof m === 'string' ? m : (m?._id || m?.id);
                }).filter(Boolean);
              } else if (todo.assigned) {
                // Single value - convert to array
                const memberId = typeof todo.assigned === 'string'
                  ? todo.assigned
                  : (todo.assigned?._id || todo.assigned?.id);
                if (memberId) {
                  cleanedTodo.assigned = [memberId];
                }
              }
            } else if (todo.assignedMembers) {
              // Fallback: handle assignedMembers field
              if (Array.isArray(todo.assignedMembers)) {
                cleanedTodo.assigned = todo.assignedMembers.map((m: any) => {
                  return typeof m === 'string' ? m : (m?._id || m?.id);
                }).filter(Boolean);
              }
            }

            // Include dueDate (same format as checklist - ISO string)
            if (todo.dueDate !== undefined) {
              cleanedTodo.dueDate = todo.dueDate || null;
            }

            // Include dueTime if provided
            if (todo.dueTime !== undefined) {
              cleanedTodo.dueTime = todo.dueTime || null;
            }

            // Remove frontend-specific fields
            delete cleanedTodo.id;
            delete cleanedTodo.text;
            delete cleanedTodo.completed;
            delete cleanedTodo._isChanged;
            delete cleanedTodo.assignedMembers; // Use 'assigned' instead

            return cleanedTodo;
          }) : value;
          fieldToUpdate.todo = cleanedTodos; // Use 'todo' for todo fields
        }
      } else {
        fieldToUpdate.value = value; // Use 'value' for other fields
      }

      await operations.updateTask({ custom_fields: [fieldToUpdate] });
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
    },
    [operations, customFieldDefinitions]
  );

  const handleRemoveMember = () => {
    if (selectedMemberForProfile) {
      toggleMember(selectedMemberForProfile.id);
      setSelectedMemberForProfile(null);
    }
  };

  const memberProfileTriggerRef = useRef<HTMLElement | null>(null);

  // Sync taskTitleValue with task.taskTitle
  // Use useMemo to derive value instead of useEffect to avoid cascading renders
  const derivedTaskTitleValue = useMemo(() => {
    return task?.taskTitle || '';
  }, [task?.taskTitle]);

  // Only update state if value actually changed
  useEffect(() => {
    if (task?.taskTitle !== undefined && taskTitleValue !== derivedTaskTitleValue) {
      setTaskTitleValue(derivedTaskTitleValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedTaskTitleValue]);

  useEffect(() => {
    if (selectedMemberForProfile && memberBadgeRefs.current[selectedMemberForProfile.id]) {
      memberProfileTriggerRef.current = memberBadgeRefs.current[selectedMemberForProfile.id];
    } else {
      memberProfileTriggerRef.current = membersSectionRef.current;
    }
  }, [selectedMemberForProfile]);

  // Custom field handlers
  const handleEditCustomFieldValue = (fieldId: string) => {
    const field = currentCustomFields.find((f) => f._id === fieldId || f.title === fieldId);
    if (field) {
      const fieldDef = getCustomFieldDefinitions([fieldId]);
      setEditingField(fieldDef[0]);
      setEditingFieldId(fieldId);
      setCustomFieldsDropdownOpen(false);
      setTimeout(() => {
        setCustomFieldValueEditorOpen(true);
      }, 100);
    }
  };

  const handleCreateCustomFieldClick = () => {
    setEditingField(undefined);
    setCustomFieldsDropdownOpen(false);
    setCreateCustomFieldDropdownOpen(true);
  };

  const handleBackToCustomFields = () => {
    setCreateCustomFieldDropdownOpen(false);
    setEditingField(undefined);
    setCustomFieldsDropdownOpen(true);
  };

  const handleSaveCustomFieldValue = (value: any) => {
    if (editingFieldId) {
      setCustomFieldValue(editingFieldId, value);
    }
  };

  const handleRemoveCustomFieldValue = () => {
    if (editingFieldId) {
      removeCustomFieldValue(editingFieldId);
    }
  };

  // Description field handlers
  const handleStartEditDescription = () => {
    setEditingDescriptionContent(description || '');
    setIsEditingDescription(true);
    // setHasDescriptionChanges(false);
  };

  const handleSaveDescription = () => {
    setDescription(editingDescriptionContent);
    setIsEditingDescription(false);
    // setHasDescriptionChanges(false);
  };

  const handleCancelDescription = () => {
    setEditingDescriptionContent(description || '');
    setIsEditingDescription(false);
    // setHasDescriptionChanges(false);
  };

  const handleDescriptionChange = (content: { text: string; html: string; json: any }) => {
    // If we're not in edit mode yet (empty description case), enter edit mode when user starts typing
    if (!isEditingDescription) {
      setIsEditingDescription(true);
    }
    // Update the editing content
    setEditingDescriptionContent(content.html);
    // Check if content has changed from original (or if we have any content when starting from empty)
    // const originalContent = description || '';
    // const hasChanged = content.html !== originalContent && content.html.trim() !== '';
    // setHasDescriptionChanges(hasChanged);
  };

  // Sync editingDescriptionContent when description prop changes (but not when editing)
  // Use useMemo to derive value instead of direct setState in useEffect
  const derivedDescriptionContent = useMemo(() => {
    return description || '';
  }, [description]);

  useEffect(() => {
    if (!isEditingDescription && editingDescriptionContent !== derivedDescriptionContent) {
      setEditingDescriptionContent(derivedDescriptionContent);
      // setHasDescriptionChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedDescriptionContent, isEditingDescription]);

  const checklistPropsFor = useCallback((checklist: ChecklistType) => {
    return {
      checklist,
      onUpdateTitle: (newTitle: string) => updateChecklist(checklist.id, { title: newTitle }),
      onToggleHideChecked: () =>
        updateChecklist(checklist.id, { hideCheckedItems: !checklist.hideCheckedItems }),
      onDelete: () => deleteChecklist(checklist.id),
      onAddItem: (text: string, metadata?: any) => {
        const tempId = `item-${Date.now()}`;
        addChecklistItem(checklist.id, text, metadata).then(() => {
          // Refetch will update with real ID from server
        });
        return tempId;
      },
      onUpdateItem: (itemId: string, text: string) =>
        updateChecklistItem(checklist.id, itemId, { text }),
      onDeleteItem: (itemId: string) => deleteChecklistItem(checklist.id, itemId),
      onToggleItemCompletion: (itemId: string) => toggleChecklistItem(checklist.id, itemId),
      onSetItemDueDate: (itemId: string, date?: string, time?: string, reminder?: ReminderOption) =>
        setChecklistItemDueDate(checklist.id, itemId, date, time, reminder),
      onRemoveItemDueDate: (itemId: string) => removeChecklistItemDueDate(checklist.id, itemId),
      onAssignMembers: (itemId: string, memberIds: string[]) =>
        assignChecklistMembers(checklist.id, itemId, memberIds),
      onAssignChecklist: (memberIds: string[]) => assignChecklist(checklist.id, memberIds),
      onSetChecklistDueDate: (date?: string, time?: string) =>
        setChecklistDueDate(checklist.id, date, time),
      onToggleChecklistComplete: (nextValue: boolean) =>
        toggleChecklistComplete(checklist.id, nextValue),
      taskMemberIds: taskMembers,
      boardId: task.board_id,
      progress: getChecklistProgress(checklist.id),
    };
  }, [
    updateChecklist,
    deleteChecklist,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    toggleChecklistItem,
    setChecklistItemDueDate,
    removeChecklistItemDueDate,
    assignChecklistMembers,
    assignChecklist,
    setChecklistDueDate,
    toggleChecklistComplete,
    taskMembers,
    task.board_id,
    getChecklistProgress,
  ]);

  const customFieldSectionPropsFor = useCallback((fieldDef: CustomFieldDefinition, fieldValue: CustomFieldValue) => {
    return {
      fieldDefinition: fieldDef,
      fieldValue,
      onUpdate: (value: any) => setCustomFieldValue(fieldDef.id, value),
      onRemove: () => removeCustomFieldValue(fieldDef.id),
      taskId: task._id || task.id,
    };
  }, [setCustomFieldValue, removeCustomFieldValue, task._id, task.id]);

  const compactFileUploadProps = useMemo(() => {
    return {
      taskId: task._id || task.id,
      currentAttachments: currentAttachments as string[],
      onUploadComplete: handleUploadComplete,
    };
  }, [task._id, task.id, currentAttachments, handleUploadComplete]);

  const actionButtonsProps = useMemo(() => {
    return {
      taskId: task._id,
      currentLabels,
      createNewLabel,
      editLabel,
      taskMembers,
      boardId: task.board_id,
      taskDates,
      saveDates,
      removeDates,
      createChecklist,
      taskCustomFields,
      currentCustomFields,
      getCustomFieldDefinitions,
      createCustomField: createCustomFieldFn,
      updateCustomFieldDef,
      setCustomFieldValue,
      removeCustomFieldValue,
      toggleCustomFieldOnTask,
      hideBoardFeatures,
      compactFileUploadProps,
    };
  }, [
    task._id,
    task.board_id,
    currentLabels,
    createNewLabel,
    editLabel,
    taskMembers,
    taskDates,
    saveDates,
    removeDates,
    createChecklist,
    taskCustomFields,
    currentCustomFields,
    getCustomFieldDefinitions,
    createCustomFieldFn,
    updateCustomFieldDef,
    setCustomFieldValue,
    removeCustomFieldValue,
    toggleCustomFieldOnTask,
    hideBoardFeatures,
    compactFileUploadProps,
  ]);

  const attachmentDocuments = useMemo(() => {
    if (!attachments || !Array.isArray(attachments)) return [];
    return attachments.map((attachment) => ({
      _id: attachment.id,
      filename: attachment.filename,
      filetype: attachment.type,
      type: attachment.type,
      size: attachment.size,
      uploadedAt: attachment.uploadedAt,
      updatedAt: attachment.uploadedAt,
    }));
  }, [attachments]);

  const datesDropdownProps = useMemo(() => {
    return {
      isOpen: datesDropdownOpen,
      onClose: () => setDatesDropdownOpen(false),
      triggerRef: dateDisplayRef as React.RefObject<HTMLElement>,
      taskId: task._id || task.id,
      dates: taskDates,
      onSave: saveDates,
      onRemove: removeDates,
    };
  }, [datesDropdownOpen, task._id, task.id, taskDates, saveDates, removeDates]);

  const labelsDropdownProps = useMemo(() => {
    return {
      isOpen: labelsDropdown.labelsDropdownOpen,
      onClose: labelsDropdown.closeLabelsDropdown,
      triggerRef: labelsTextRef as React.RefObject<HTMLElement>,
      taskId: task._id,
      currentLabels,
      onCreateLabel: labelsDropdown.handleCreateLabelClick,
      onEditLabel: labelsDropdown.handleEditLabel,
    };
  }, [
    labelsDropdown.labelsDropdownOpen,
    labelsDropdown.closeLabelsDropdown,
    labelsDropdown.handleCreateLabelClick,
    labelsDropdown.handleEditLabel,
    task._id,
    currentLabels,
  ]);

  const createLabelDropdownKey = useMemo(() => {
    return `create-label-${labelsDropdown.editingLabel?._id || labelsDropdown.editingLabel?.id || 'new'}-${labelsDropdown.createLabelDropdownOpen}`;
  }, [labelsDropdown.editingLabel, labelsDropdown.createLabelDropdownOpen]);

  const createLabelDropdownProps = useMemo(() => {
    return {
      isOpen: labelsDropdown.createLabelDropdownOpen,
      onClose: labelsDropdown.closeCreateLabelDropdown,
      triggerRef: labelsTextRef as React.RefObject<HTMLElement>,
      taskId: task._id,
      editingLabel: labelsDropdown.editingLabel,
      onCreate: labelsDropdown.handleCreateLabel,
      onUpdate: labelsDropdown.handleUpdateLabel,
      onBack: labelsDropdown.editingLabel ? undefined : labelsDropdown.handleBackToLabels,
    };
  }, [
    labelsDropdown.createLabelDropdownOpen,
    labelsDropdown.closeCreateLabelDropdown,
    labelsDropdown.editingLabel,
    labelsDropdown.handleCreateLabel,
    labelsDropdown.handleUpdateLabel,
    labelsDropdown.handleBackToLabels,
    task._id,
  ]);

  const memberAssignmentProps = useMemo(() => {
    return {
      isOpen: membersDropdownOpen,
      onClose: () => setMembersDropdownOpen(false),
      triggerRef: membersSectionRef as React.RefObject<HTMLElement>,
      context: 'task' as const,
      taskId: task._id || task.id,
      boardId: task.board_id,
      assignedMemberIds: taskMembers,
      subTaskMemberIds,
      autoSave: true,
    };
  }, [
    membersDropdownOpen,
    task._id,
    task.id,
    task.board_id,
    taskMembers,
    subTaskMemberIds,
  ]);

  const memberProfileDropdownProps = useMemo(() => {
    if (!selectedMemberForProfile) return null;
    return {
      isOpen: memberProfileDropdownOpen,
      onClose: () => {
        setMemberProfileDropdownOpen(false);
        setSelectedMemberForProfile(null);
      },
      triggerRef: memberProfileTriggerRef as React.RefObject<HTMLElement>,
      member: selectedMemberForProfile,
      onRemove: handleRemoveMember,
    };
  }, [
    memberProfileDropdownOpen,
    selectedMemberForProfile,
    handleRemoveMember,
  ]);

  const customFieldsDropdownProps = useMemo(() => {
    return {
      isOpen: customFieldsDropdownOpen,
      onClose: () => {
        setCustomFieldsDropdownOpen(false);
        setEditingField(undefined);
      },
      triggerRef: customFieldsSectionRef as React.RefObject<HTMLElement>,
      taskId: task._id || task.id,
      cardFieldValues: taskCustomFields,
      onEditFieldValue: handleEditCustomFieldValue,
      onCreateField: handleCreateCustomFieldClick,
    };
  }, [
    customFieldsDropdownOpen,
    task._id,
    task.id,
    taskCustomFields,
    handleEditCustomFieldValue,
    handleCreateCustomFieldClick,
  ]);

  const editingFieldForDropdown = useMemo(() => {
    if (!editingField) return undefined;
    const apiField = currentCustomFields.find(
      (f) => f._id === editingField.id || f.title === editingField.title
    );
    return (
      apiField || {
        _id: editingField.id,
        title: editingField.title,
        field_type: editingField.field_type,
        options: editingField.options,
      }
    );
  }, [editingField, currentCustomFields]);

  const createCustomFieldDropdownProps = useMemo(() => {
    return {
      isOpen: createCustomFieldDropdownOpen,
      onClose: () => {
        setCreateCustomFieldDropdownOpen(false);
        setEditingField(undefined);
      },
      triggerRef: customFieldsSectionRef as React.RefObject<HTMLElement>,
      taskId: task._id || task.id,
      editingField: editingFieldForDropdown,
      allCustomFields: currentCustomFields,
      onBack: editingField ? undefined : handleBackToCustomFields,
    };
  }, [
    createCustomFieldDropdownOpen,
    task._id,
    task.id,
    editingField,
    editingFieldForDropdown,
    currentCustomFields,
    handleBackToCustomFields,
  ]);

  const currentFieldValue = useMemo(() => {
    if (!editingFieldId) return undefined;
    const fieldValue = taskCustomFields.find((fv) => fv.fieldId === editingFieldId);
    return fieldValue?.value;
  }, [editingFieldId, taskCustomFields]);

  const customFieldValueEditorProps = useMemo(() => {
    if (!editingField) return null;
    return {
      isOpen: customFieldValueEditorOpen,
      onClose: () => {
        setCustomFieldValueEditorOpen(false);
        setEditingField(undefined);
        setEditingFieldId('');
      },
      triggerRef: customFieldsSectionRef as React.RefObject<HTMLElement>,
      fieldDefinition: editingField,
      currentValue: currentFieldValue,
      onSave: handleSaveCustomFieldValue,
      onRemove: handleRemoveCustomFieldValue,
    };
  }, [
    customFieldValueEditorOpen,
    editingField,
    currentFieldValue,
    handleSaveCustomFieldValue,
    handleRemoveCustomFieldValue,
  ]);

  return {
    updateTask,
    documentPreview,
    currentLabels,
    currentCustomFields,
    currentAttachments,
    getCustomFieldDefinitions,
    subTaskMemberIds,
    displayMembers,
    createNewLabel,
    editLabel,
    toggleMember,
    saveDates,
    removeDates,
    createChecklist,
    updateChecklist,
    toggleChecklistComplete,
    deleteChecklist,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    toggleChecklistItem,
    setChecklistItemDueDate,
    removeChecklistItemDueDate,
    assignChecklistMembers,
    assignChecklist,
    setChecklistDueDate,
    getChecklistProgress,
    createCustomFieldFn,
    updateCustomFieldDef,
    removeCustomFieldValue,
    toggleCustomFieldOnTask,
    handleUploadComplete,
    handleDeleteComplete,
    handlePreview,
    downloadAttachment,
    labelsDropdown,
    dateDisplayRef,
    labelsSectionRef,
    labelsTextRef,
    membersSectionRef,
    customFieldsSectionRef,
    datesDropdownOpen,
    setDatesDropdownOpen,
    membersDropdownOpen,
    setMembersDropdownOpen,
    memberProfileDropdownOpen,
    setMemberProfileDropdownOpen,
    selectedMemberForProfile,
    setSelectedMemberForProfile,
    customFieldsDropdownOpen,
    setCustomFieldsDropdownOpen,
    createCustomFieldDropdownOpen,
    setCreateCustomFieldDropdownOpen,
    customFieldValueEditorOpen,
    setCustomFieldValueEditorOpen,
    editingField,
    setEditingField,
    editingFieldId,
    setEditingFieldId,
    isEditingDescription,
    editingDescriptionContent,
    taskTitleValue,
    customFieldDefinitions,
    topRowFields,
    descriptionFields,
    sectionFields,
    setCustomFieldValue,
    handleRemoveMember,
    memberProfileTriggerRef,
    handleEditCustomFieldValue,
    handleCreateCustomFieldClick,
    handleBackToCustomFields,
    handleSaveCustomFieldValue,
    handleRemoveCustomFieldValue,
    handleStartEditDescription,
    handleSaveDescription,
    handleCancelDescription,
    handleDescriptionChange,
    actionButtonsProps,
    checklistPropsFor,
    customFieldSectionPropsFor,
    compactFileUploadProps,
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
  };
};
