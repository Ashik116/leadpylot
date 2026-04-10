import { useCallback, useMemo } from 'react';
import { useUpdateTask, useDeleteTaskItem } from '@/hooks/useTasks';
import { UpdateTaskRequest } from '@/services/TaskService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

interface UseTaskOperationsOptions {
    taskId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    boardId?: string | string[] | Array<{ _id?: string;[key: string]: any }>;
}

// Helper: Clean todo item - only send required fields
// Note: Currently unused but kept for potential future use
// const cleanTodoItem = (todo: any): { _id?: string; title: string; isCompleted: boolean; isDeleted?: boolean } => {
//     return {
//         ...(todo._id ? { _id: todo._id } : {}),
//         title: todo.title || todo.taskTitle || '',
//         isCompleted: todo.isCompleted ?? false,
//         ...(todo.isDeleted !== undefined ? { isDeleted: todo.isDeleted } : {}),
//     };
// };

// Helper: Clean checklist - only send required fields
// Note: Currently unused but kept for potential future use
// const cleanSubTask = (st: any): { _id?: string; taskTitle: string; isDeleted?: boolean; todo?: Array<{ _id?: string; title: string; isCompleted: boolean; isDeleted?: boolean }> } => {
//     const cleaned: { _id?: string; taskTitle: string; isDeleted?: boolean; todo?: Array<{ _id?: string; title: string; isCompleted: boolean; isDeleted?: boolean }> } = {
//         ...(st._id ? { _id: st._id } : {}),
//         taskTitle: st.taskTitle || '',
//         ...(st.isDeleted !== undefined ? { isDeleted: st.isDeleted } : {}),
//     };
//     if (st.todo && Array.isArray(st.todo) && st.todo.length > 0) {
//         cleaned.todo = st.todo.map(cleanTodoItem);
//     }
//     return cleaned;
// };

// Helper: Format date and time into ISO string (e.g., "2024-12-31T23:59:59Z")
const formatDateWithTime = (date: string, time?: string): string => {
    if (!date) return '';

    let dateTime = dayjs(date);

    if (time) {
        // Parse time string - could be "12:00 PM" or "12:00" format
        // Try to parse as 12-hour format first
        const pmMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (pmMatch) {
            let hours = parseInt(pmMatch[1], 10);
            const minutes = parseInt(pmMatch[2], 10);
            const ampm = pmMatch[3].toUpperCase();

            if (ampm === 'PM' && hours !== 12) {
                hours += 12;
            } else if (ampm === 'AM' && hours === 12) {
                hours = 0;
            }

            dateTime = dateTime.hour(hours).minute(minutes).second(59).millisecond(0);
        } else {
            // Try 24-hour format
            const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1], 10);
                const minutes = parseInt(timeMatch[2], 10);
                dateTime = dateTime.hour(hours).minute(minutes).second(59).millisecond(0);
            } else {
                // Default to end of day
                dateTime = dateTime.hour(23).minute(59).second(59).millisecond(0);
            }
        }
    } else {
        // No time specified, default to end of day
        dateTime = dateTime.hour(23).minute(59).second(59).millisecond(0);
    }

    return dateTime.utc().toISOString();
};

/**
 * Hook that provides helper functions for task operations
 * Wraps useUpdateTask mutation and provides convenient methods
 * Works directly with UpdateTaskRequest format (API response pattern)
 */
export function useTaskOperations({ taskId, onSuccess, onError, boardId }: UseTaskOperationsOptions) {
    const updateTaskMutation = useUpdateTask();
    const deleteTaskItemMutation = useDeleteTaskItem();

    // Extract board_id as string from various formats
    const boardIdString = useMemo(() => {
        if (!boardId) return undefined;
        if (typeof boardId === 'string') return boardId;
        if (Array.isArray(boardId) && boardId.length > 0) {
            const first = boardId[0];
            if (typeof first === 'string') return first;
            if (first && typeof first === 'object' && first._id) return first._id;
        }
        return undefined;
    }, [boardId]);

    // Generic update function - accepts UpdateTaskRequest directly
    const updateTask = useCallback(
        async (updates: Partial<UpdateTaskRequest>) => {
            try {
                // Include board_id in the payload if available
                const updateData: any = { ...updates };
                if (boardIdString) {
                    updateData.board_id = boardIdString;
                }
                await updateTaskMutation.mutateAsync({ id: taskId, data: updateData });
                onSuccess?.();
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Failed to update task');
                onError?.(err);
                throw err;
            }
        },
        [taskId, boardIdString, updateTaskMutation, onSuccess, onError]
    );

    // Helper: Update a single field
    const updateTaskField = useCallback(
        async (field: keyof UpdateTaskRequest, value: any) => {
            await updateTask({ [field]: value } as Partial<UpdateTaskRequest>);
        },
        [updateTask]
    );

    // Helper: Toggle completion status
    const toggleComplete = useCallback(
        async (currentValue: boolean) => {
            await updateTaskField('isCompleted', !currentValue);
        },
        [updateTaskField]
    );

    // Helper: Update title
    const updateTitle = useCallback(
        async (title: string) => {
            await updateTask({ taskTitle: title });
        },
        [updateTask]
    );

    // Helper: Update description
    const updateDescription = useCallback(
        async (description: string) => {
            await updateTask({ taskDescription: description });
        },
        [updateTask]
    );

    // Helper: Toggle label
    // API format: labels is array of objects with { _id, title, color }
    const toggleLabel = useCallback(
        async (labelId: string, currentLabels: Array<{ _id: string; title?: string; color?: string }>) => {
            const labelIndex = currentLabels.findIndex((l) => l._id === labelId);
            let newLabels: Array<{ _id: string; title?: string; color?: string }>;

            if (labelIndex >= 0) {
                // Remove label
                newLabels = currentLabels.filter((l) => l._id !== labelId);
            } else {
                // Add label (just with _id, API will handle the rest)
                newLabels = [...currentLabels, { _id: labelId }];
            }
            await updateTask({ labels: newLabels });
        },
        [updateTask]
    );

    // Helper: Toggle member
    // API format: assigned is array of member IDs (strings)
    const toggleMember = useCallback(
        async (memberId: string, currentMembers: string[]) => {
            const newMembers = currentMembers.includes(memberId)
                ? currentMembers.filter((id) => id !== memberId)
                : [...currentMembers, memberId];
            await updateTask({ assigned: newMembers });
        },
        [updateTask]
    );

    // Helper: Save dates
    // API format: dueDate is a string (ISO date)
    const saveDates = useCallback(
        async (dates: { dueDate?: string; startDate?: string; dueTime?: string; startTime?: string }) => {
            await updateTask({ dueDate: dates.dueDate || null });
        },
        [updateTask]
    );

    // Helper: Remove dates
    const removeDates = useCallback(
        async () => {
            await updateTask({ dueDate: null });
        },
        [updateTask]
    );

    // Helper: Create checklist
    // Only send the new checklist being created, not all existing checklists
    const createChecklist = useCallback(
        async (title: string, selectedTodoTypeIds?: any[], currentSubTasks?: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>) => {
            // currentSubTasks parameter kept for API compatibility but not used
            void currentSubTasks;

            // If predefined todo types are selected, pass their IDs directly as strings in subTask array
            if (selectedTodoTypeIds && selectedTodoTypeIds.length > 0) {
                // Pass todo type IDs directly as strings in subTask array
                await updateTask({ subTask: selectedTodoTypeIds });
                // Return a Checklist-like object for compatibility
                return {
                    id: `checklist-${Date.now()}`,
                    title: title || 'Predefined Checklist',
                    items: [],
                    hideCheckedItems: false,
                };
            }

            // Otherwise, create a normal checklist with title
            const newSubTask = {
                // New checklist doesn't have _id - API will generate it
                taskTitle: title,
                todo: [],
            };
            // Only send the new checklist
            await updateTask({ subTask: [newSubTask] });
            // Return a Checklist-like object for compatibility
            return {
                id: `checklist-${Date.now()}`,
                title,
                items: [],
                hideCheckedItems: false,
            };
        },
        [updateTask]
    );

    type ChecklistUpdate = {
        title?: string;
        hideCheckedItems?: boolean;
        assignedMembers?: string[];
        dueDate?: string;
        dueTime?: string;
        isCompleted?: boolean;
    };
    // Helper: Update checklist
    // Only send the specific checklist being updated, not all checklists
    const updateChecklist = useCallback(
        async (checklistId: string, updates: ChecklistUpdate, currentSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[]; assigned?: string | string[] | any; dueDate?: string }>
        ) => {
            // Find the checklist being updated
            const checklistToUpdate = currentSubTasks.find((st) => st._id === checklistId || !st._id);
            if (checklistToUpdate) {
                // Build the updated checklist object - don't spread to avoid including object-formatted fields
                const updatedData: any = {
                    _id: checklistToUpdate._id,
                    taskTitle: updates.title || checklistToUpdate.taskTitle,
                };

                // Handle assigned (convert to array of string IDs)
                // Ensure all members are string IDs, not objects
                if (updates.assignedMembers !== undefined) {
                    if (updates.assignedMembers.length > 0) {
                        // Convert all members to string IDs
                        updatedData.assigned = updates.assignedMembers.map((memberId: any) => {
                            return typeof memberId === 'string' ? memberId : ((memberId as any)?._id || memberId);
                        }).filter(Boolean);
                    } else {
                        // If removing assignment, set to empty array
                        updatedData.assigned = [];
                    }
                } else if (checklistToUpdate.assigned) {
                    // If not updating assigned but it exists, normalize it to ensure it's an array of string IDs
                    // This prevents sending object format when updating other fields
                    const existingAssigned = checklistToUpdate.assigned;
                    if (Array.isArray(existingAssigned)) {
                        // Normalize array - extract _id if objects, keep strings as-is
                        updatedData.assigned = existingAssigned.map((member: any) => {
                            if (typeof member === 'string') return member;
                            if (member && typeof member === 'object' && member._id) return member._id;
                            return member;
                        }).filter(Boolean);
                    } else if (typeof existingAssigned === 'object' && existingAssigned !== null) {
                        // Single object - convert to array
                        updatedData.assigned = [(existingAssigned as any)._id].filter(Boolean);
                    } else if (typeof existingAssigned === 'string') {
                        // Single string - convert to array
                        updatedData.assigned = [existingAssigned];
                    }
                }

                // Handle dueDate (format as ISO string with time)
                if (updates.dueDate !== undefined) {
                    if (updates.dueDate) {
                        updatedData.dueDate = formatDateWithTime(updates.dueDate, updates.dueTime);
                    } else {
                        updatedData.dueDate = undefined;
                    }
                }
                if (updates.isCompleted !== undefined) {
                    updatedData.isCompleted = updates.isCompleted;
                }

                // Only send the updated checklist with _id and updated fields
                const updated: any = {
                    _id: checklistToUpdate._id,
                    taskTitle: updates.title || checklistToUpdate.taskTitle,
                    ...updatedData,
                };

                // Include assigned if it exists in updatedData (normalized)
                if (updatedData.assigned !== undefined) {
                    updated.assigned = updatedData.assigned ?? [];
                }

                // Include dueDate if it's being updated
                if (updates.dueDate !== undefined) {
                    updated.dueDate = updatedData.dueDate || null;
                }
                if (updates.isCompleted !== undefined) {
                    updated.isCompleted = updatedData.isCompleted;
                }
                if (updates.isCompleted === true && Array.isArray(checklistToUpdate.todo)) {
                    const todoUpdates = checklistToUpdate.todo
                        .filter((todo: any) => todo && todo._id)
                        .map((todo: any) => ({
                            _id: todo._id,
                            isCompleted: true,
                        }));
                    if (todoUpdates.length > 0) {
                        updated.todo = todoUpdates;
                    }
                }

                await updateTask({ subTask: [updated] });
            }
        },
        [updateTask]
    );

    // Helper: Delete checklist
    // Use DELETE API instead of PUT
    const deleteChecklist = useCallback(
        async (checklistId: string, currentSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>) => {
            // Find the checklist to delete by _id (checklistId should be the _id from the API)
            const checklistToDelete = currentSubTasks.find((st) => st._id === checklistId);
            if (checklistToDelete && checklistToDelete._id) {
                // Use DELETE API with subTaskId
                try {
                    await deleteTaskItemMutation.mutateAsync({
                        taskId,
                        params: {
                            subTaskId: checklistToDelete._id,
                        },
                    });
                    onSuccess?.();
                } catch (error) {
                    const err = error instanceof Error ? error : new Error('Failed to delete Subtask');
                    onError?.(err);
                    throw err;
                }
            }
        },
        [taskId, deleteTaskItemMutation, onSuccess, onError]
    );

    // Helper: Add checklist item
    // Only send the specific checklist with only the newly added item, not all items
    const addChecklistItem = useCallback(
        async (
            checklistId: string,
            text: string,
            metadata: {
                assignedMembers?: string[];
                dueDate?: string;
                dueTime?: string;
                reminder?: any;
            } = {},
            currentSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>
        ) => {
            // Find the checklist to add item to
            const checklistToUpdate = currentSubTasks.find((st) => st._id === checklistId || !st._id);
            if (checklistToUpdate) {
                // Build the new todo item with all metadata
                const newTodoItem: any = {
                    // New items don't have _id - API will generate it
                    title: text,
                    isCompleted: false,
                };

                // Handle assigned (convert to array of string IDs)
                // Ensure all members are string IDs, not objects
                if (metadata.assignedMembers && metadata.assignedMembers.length > 0) {
                    newTodoItem.assigned = metadata.assignedMembers.map((memberId: any) => {
                        return typeof memberId === 'string' ? memberId : ((memberId as any)?._id || memberId);
                    }).filter(Boolean);
                }

                // Handle dueDate (format as ISO string with time)
                if (metadata.dueDate) {
                    newTodoItem.dueDate = formatDateWithTime(metadata.dueDate, metadata.dueTime);
                }

                // Only send the checklist with only the newly added item
                const updated = {
                    _id: checklistToUpdate._id,
                    todo: [newTodoItem], // Only send the new item, not all existing items
                };

                await updateTask({ subTask: [updated] });
            }
            // Return ChecklistItem-like object for compatibility
            return {
                id: `item-${Date.now()}`,
                text,
                completed: false,
                assignedMembers: metadata.assignedMembers,
                dueDate: metadata.dueDate,
                dueTime: metadata.dueTime,
                reminder: metadata.reminder,
            };
        },
        [updateTask]
    );

    // Helper: Update checklist item
    // Only send the specific checklist being updated with only the changed item, not all checklists
    const updateChecklistItem = useCallback(
        async (
            checklistId: string,
            itemId: string,
            updates: { text?: string; completed?: boolean; dueDate?: string; dueTime?: string; reminder?: any; assignedMembers?: string[] },
            currentSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>
        ) => {
            // Find the checklist containing the item to update
            const checklistToUpdate = currentSubTasks.find((st) => st._id === checklistId || !st._id);
            if (checklistToUpdate) {
                // Find the item to update
                const itemToUpdate = (checklistToUpdate.todo || []).find((todo: any) => todo._id === itemId || (!todo._id && !itemId));
                if (itemToUpdate && itemToUpdate._id) {
                    // Build the updated item object - only include fields that are being updated
                    const updatedItemData: any = {
                        _id: itemToUpdate._id,
                    };

                    // Include title if text is being updated
                    if (updates.text !== undefined) {
                        updatedItemData.title = updates.text;
                    }

                    // Include isCompleted if completion status is being updated
                    if (updates.completed !== undefined) {
                        updatedItemData.isCompleted = updates.completed;
                    }

                    // Handle assigned (convert to array of string IDs)
                    // Ensure all members are string IDs, not objects
                    if (updates.assignedMembers !== undefined) {
                        if (updates.assignedMembers.length > 0) {
                            // Convert all members to string IDs
                            updatedItemData.assigned = updates.assignedMembers.map((memberId: any) => {
                                return typeof memberId === 'string' ? memberId : ((memberId as any)?._id || memberId);
                            }).filter(Boolean);
                        } else {
                            // If removing assignment, set to empty array
                            updatedItemData.assigned = [];
                        }
                    } else if (itemToUpdate.assigned) {
                        // If not updating assigned but it exists, normalize it to ensure it's an array of string IDs
                        // This prevents sending object format when updating other fields
                        const existingAssigned = itemToUpdate.assigned;
                        if (Array.isArray(existingAssigned)) {
                            // Normalize array - extract _id if objects, keep strings as-is
                            updatedItemData.assigned = existingAssigned.map((member: any) => {
                                if (typeof member === 'string') return member;
                                if (member && typeof member === 'object' && member._id) return member._id;
                                return member;
                            }).filter(Boolean);
                        } else if (typeof existingAssigned === 'object' && existingAssigned !== null) {
                            // Single object - convert to array
                            updatedItemData.assigned = [(existingAssigned as any)._id].filter(Boolean);
                        } else if (typeof existingAssigned === 'string') {
                            // Single string - convert to array
                            updatedItemData.assigned = [existingAssigned];
                        }
                    }

                    // Handle dueDate (format as ISO string with time)
                    if (updates.dueDate !== undefined) {
                        if (updates.dueDate) {
                            updatedItemData.dueDate = formatDateWithTime(updates.dueDate, updates.dueTime);
                        } else {
                            // If removing due date, set to null
                            updatedItemData.dueDate = null;
                        }
                    }

                    // Only send the checklist with the updated item
                    const updated: any = {
                        _id: checklistToUpdate._id,
                        todo: [updatedItemData],
                    };

                    if (updates.completed !== undefined) {
                        const todos = (checklistToUpdate.todo || []).filter(
                            (todo: any) => todo && !todo.isDelete && !todo.isDeleted
                        );
                        const allCompleted = todos.length > 0 && todos.every((todo: any) => {
                            if (todo._id === itemToUpdate._id) return updates.completed;
                            return todo.isCompleted !== undefined ? todo.isCompleted : (todo.completed || false);
                        });
                        updated.isCompleted = allCompleted;
                    }

                    await updateTask({ subTask: [updated] });
                }
            }
        },
        [updateTask]
    );

    // Helper: Delete checklist item
    // Use DELETE API instead of PUT
    const deleteChecklistItem = useCallback(
        async (checklistId: string, itemId: string, currentSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>) => {
            // Find the checklist containing the item to delete by _id (checklistId should be the _id from the API)
            const checklistToUpdate = currentSubTasks.find((st) => st._id === checklistId);
            if (checklistToUpdate && checklistToUpdate._id) {
                // Find the item to delete by _id (itemId should be the _id from the API)
                const itemToDelete = (checklistToUpdate.todo || []).find((todo: any) => todo._id === itemId);
                if (itemToDelete && itemToDelete._id) {
                    // Use DELETE API with subTaskId and nestedTodoId
                    try {
                        await deleteTaskItemMutation.mutateAsync({
                            taskId,
                            params: {
                                subTaskId: checklistToUpdate._id,
                                nestedTodoId: itemToDelete._id,
                            },
                        });
                        onSuccess?.();
                    } catch (error) {
                        const err = error instanceof Error ? error : new Error('Failed to delete Subtask item');
                        onError?.(err);
                        throw err;
                    }
                }
            }
        },
        [taskId, deleteTaskItemMutation, onSuccess, onError]
    );

    // Helper: Toggle checklist item
    // Uses updateChecklistItem which already cleans the data
    const toggleChecklistItem = useCallback(
        async (checklistId: string, itemId: string, currentSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>) => {
            const subTask = currentSubTasks.find((st) => (st._id === checklistId || !st._id));
            const todoItem = subTask?.todo?.find((todo: any) => (todo._id === itemId || !todo._id));
            if (todoItem) {
                await updateChecklistItem(
                    checklistId,
                    itemId,
                    { completed: !todoItem.isCompleted },
                    currentSubTasks
                );
            }
        },
        [updateChecklistItem]
    );

    // Helper: Set custom field value
    // API format: custom_fields is array of objects with { _id, value }
    const setCustomFieldValue = useCallback(
        async (fieldId: string, value: any, currentCustomFields: Array<{ _id?: string; field_id?: string; value?: any }>) => {
            const existingIndex = currentCustomFields.findIndex((cf) => (cf._id === fieldId || cf.field_id === fieldId));
            let newFieldValues: Array<{ _id?: string; field_id?: string; value?: any }>;

            if (existingIndex >= 0) {
                newFieldValues = [...currentCustomFields];
                newFieldValues[existingIndex] = { _id: fieldId, value };
            } else {
                newFieldValues = [...currentCustomFields, { _id: fieldId, value }];
            }

            await updateTask({ custom_fields: newFieldValues });
        },
        [updateTask]
    );

    // Helper: Remove custom field value
    // Send field with isDelete: true instead of removing from array
    const removeCustomFieldValue = useCallback(
        async (fieldId: string, currentCustomFields: Array<{ _id?: string; field_id?: string; value?: any }>) => {
            // Find the field to delete
            const fieldToDelete = currentCustomFields.find((cf) => (cf._id === fieldId || cf.field_id === fieldId));
            if (fieldToDelete) {
                // Send the field with isDelete: true (using type assertion since API accepts this)
                await updateTask({ custom_fields: [{ _id: fieldId, isDelete: true }] as any });
            }
        },
        [updateTask]
    );

    // Helper: Toggle custom field on task
    const toggleCustomFieldOnTask = useCallback(
        async (fieldId: string, currentCustomFields: Array<{ _id?: string; field_id?: string; value?: any }>, defaultValue: any = null) => {
            const existingIndex = currentCustomFields.findIndex((cf) => (cf._id === fieldId || cf.field_id === fieldId));
            if (existingIndex >= 0) {
                await removeCustomFieldValue(fieldId, currentCustomFields);
            } else {
                await setCustomFieldValue(fieldId, defaultValue, currentCustomFields);
            }
        },
        [setCustomFieldValue, removeCustomFieldValue]
    );

    return {
        // Mutation state
        isLoading: updateTaskMutation.isPending,
        error: updateTaskMutation.error,
        isSuccess: updateTaskMutation.isSuccess,

        // Generic update
        updateTask,

        // Field updates
        updateTaskField,
        toggleComplete,
        updateTitle,
        updateDescription,

        // Labels and members
        toggleLabel,
        toggleMember,

        // Dates
        saveDates,
        removeDates,

        // Checklists
        createChecklist,
        updateChecklist,
        deleteChecklist,
        addChecklistItem,
        updateChecklistItem,
        deleteChecklistItem,
        toggleChecklistItem,

        // Custom fields
        setCustomFieldValue,
        removeCustomFieldValue,
        toggleCustomFieldOnTask,
    };
}
