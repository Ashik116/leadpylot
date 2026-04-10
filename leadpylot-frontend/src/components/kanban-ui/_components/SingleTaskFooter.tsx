'use client';

import { Clock, FileText, X, CheckSquare2, CheckSquare, MessageSquare } from 'lucide-react';
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { formatItemDueDate } from '../_data/checklists-data';
import { calculateDateStatus } from '../_data/dates-data';
import { Task, CardDates, Attachment } from '../types';
import { ApiTask } from '@/services/TaskService';
import { MemberAvatarGroup } from './MemberComponents/MemberAvatarGroup';
import { UnifiedMemberAssignment } from './MemberComponents/UnifiedMemberAssignment';
import { DatesDropdown } from '../_dropdowns/dates/DatesDropdown';
import { useUpdateTask } from '@/hooks/useTasks';
import { useTodoBoardUsers } from '@/services/hooks/useUsers';
import Button from '@/components/ui/Button';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import TaskTypeBadge from './TaskTypeBadge';

interface SingleTaskFooterProps {
    task: Task;
    boardId?: string;
    /** Called when task is updated (e.g. date or members) so parent can sync UI immediately */
    onTaskUpdated?: (apiTask: ApiTask) => void;
    hideInteractiveElements?: boolean;
    onCloseComments?: () => void;
    showCloseComments?: boolean;
    onCloseChecklist?: () => void;
    showCloseChecklist?: boolean;
    onOpenDescription?: () => void;
    onOpenComments?: () => void;
    onOpenChecklist?: () => void;
    showDescriptionIcon?: boolean;
    showComments?: boolean;
    showChecklist?: boolean;
    hideBoardFeatures?: boolean;
}

export const SingleTaskFooter: React.FC<SingleTaskFooterProps> = ({
    task,
    boardId,
    onTaskUpdated,
    hideInteractiveElements = false,
    onCloseComments,
    showCloseComments = false,
    onCloseChecklist,
    showCloseChecklist = false,
    onOpenDescription,
    onOpenComments,
    onOpenChecklist,
    showDescriptionIcon = false,
    showComments = false,
    showChecklist = false,
    hideBoardFeatures = false,
}) => {
    const [membersDropdownOpen, setMembersDropdownOpen] = useState(false);
    const membersSectionRef = useRef<HTMLDivElement>(null);
    const [datesDropdownOpen, setDatesDropdownOpen] = useState(false);
    const dateButtonRef = useRef<HTMLButtonElement>(null);
    const { mutate: updateTask } = useUpdateTask();
    const documentPreview = useDocumentPreview();
    const attachments = useMemo<Attachment[]>(() => {
        const rawAttachments = (task as any)?.attachments ?? (task as any)?.attachment ?? [];
        if (!Array.isArray(rawAttachments)) return [];

        return rawAttachments
            .map((att: any) => {
                if (typeof att === 'string') {
                    return {
                        id: att,
                        filename: 'Attachment',
                        size: 0,
                        type: 'application/octet-stream',
                        uploadedBy: 'Unknown',
                        uploadedAt: '',
                        url: undefined,
                    };
                }

                const doc = att?.document || att?.file || att;
                const id = doc?._id || att?._id || att?.id || doc?.id;
                if (!id) return null;

                return {
                    id,
                    filename: doc?.filename || doc?.name || att?.filename || att?.name || 'Attachment',
                    size: doc?.size || att?.size || 0,
                    type: doc?.type || att?.type || att?.filetype || att?.mimeType || 'application/octet-stream',
                    uploadedBy: doc?.uploadedBy || att?.uploadedBy || att?.uploaded_by || 'Unknown',
                    uploadedAt: doc?.uploadedAt || att?.uploadedAt || att?.uploaded_at || att?.createdAt || '',
                    url: doc?.url || att?.url || att?.url_path,
                } as Attachment;
            })
            .filter(Boolean) as Attachment[];
    }, [task]);
    const [previewAttachments, setPreviewAttachments] = useState<Attachment[]>([]);
    const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);

    const openAttachmentsPreview = useCallback((startIndex: number) => {
        if (!attachments.length) return;
        const safeIndex = Math.max(0, Math.min(startIndex, attachments.length - 1));
        const attachment = attachments[safeIndex];
        const previewType = getDocumentPreviewType(attachment.type, attachment.filename);
        setPreviewAttachments(attachments);
        setCurrentAttachmentIndex(safeIndex);
        documentPreview.openPreview(
            attachment.id,
            attachment.filename,
            previewType as 'pdf' | 'image' | 'other'
        );
    }, [attachments, documentPreview]);

    const handleNextAttachment = useCallback(() => {
        if (previewAttachments.length < 2 || currentAttachmentIndex >= previewAttachments.length - 1) return;
        const nextIndex = currentAttachmentIndex + 1;
        const nextAttachment = previewAttachments[nextIndex];
        const previewType = getDocumentPreviewType(nextAttachment.type, nextAttachment.filename);
        setCurrentAttachmentIndex(nextIndex);
        documentPreview.openPreview(
            nextAttachment.id,
            nextAttachment.filename,
            previewType as 'pdf' | 'image' | 'other'
        );
    }, [previewAttachments, currentAttachmentIndex, documentPreview]);

    const handlePreviousAttachment = useCallback(() => {
        if (previewAttachments.length < 2 || currentAttachmentIndex <= 0) return;
        const prevIndex = currentAttachmentIndex - 1;
        const prevAttachment = previewAttachments[prevIndex];
        const previewType = getDocumentPreviewType(prevAttachment.type, prevAttachment.filename);
        setCurrentAttachmentIndex(prevIndex);
        documentPreview.openPreview(
            prevAttachment.id,
            prevAttachment.filename,
            previewType as 'pdf' | 'image' | 'other'
        );
    }, [previewAttachments, currentAttachmentIndex, documentPreview]);

    useEffect(() => {
        if (!documentPreview.isOpen) {
            setTimeout(() => {
                setPreviewAttachments([]);
                setCurrentAttachmentIndex(0);
            }, 0);
        }
    }, [documentPreview.isOpen]);

    const formattedDate = useMemo(() => {
        if (!task.dates?.dueDate) return null;
        return formatItemDueDate(task.dates.dueDate);
    }, [task.dates]);

    // Get CardDates from task
    const taskDates = useMemo<CardDates | undefined>(() => {
        if (!task.dates) return undefined;
        return {
            startDate: task.dates.startDate,
            dueDate: task.dates.dueDate,
            startTime: task.dates.startTime,
            dueTime: task.dates.dueTime,
        };
    }, [task.dates]);

    // Calculate date status for color coding
    const dateStatus = useMemo(() => {
        if (!taskDates?.dueDate) return null;
        return calculateDateStatus(taskDates.dueDate, taskDates.dueTime);
    }, [taskDates]);

    // Get button color based on date status
    const dateButtonColor = useMemo(() => {
        switch (dateStatus) {
            case 'overdue':
                return 'bg-red-500/20 text-red-800 ';
            case 'due-today':
                return 'bg-orange-500/20 text-orange-800 ';
            case 'due-soon':
                return 'bg-yellow-500/20 text-yellow-800 ';
            default:
                return 'bg-yellow-500/20 text-yellow-800 '; // Default yellow for dates without status
        }
    }, [dateStatus]);

    // // Get text color based on date status
    // const dateButtonTextColor = useMemo(() => {
    //     return dateStatus === 'overdue' ? 'text-white' : 'text-gray-700';
    // }, [dateStatus]);

    // Save dates handler – notify parent on success so UI updates immediately
    const handleSaveDates = (dates: CardDates) => {
        if (!task.id) return;
        updateTask(
            {
                id: task.id,
                data: { dueDate: dates.dueDate || null },
            },
            {
                onSuccess: (response) => {
                    onTaskUpdated?.(response.data);
                },
            }
        );
    };

    // Remove dates handler – notify parent on success so UI updates immediately
    const handleRemoveDates = () => {
        if (!task.id) return;
        updateTask(
            {
                id: task.id,
                data: { dueDate: null },
            },
            {
                onSuccess: (response) => {
                    onTaskUpdated?.(response.data);
                },
            }
        );
    };

    // Calculate checklist progress
    const checklistProgress = useMemo(() => {
        if (!task.checklists || task.checklists.length === 0) {
            return { completed: 0, total: 0 };
        }

        let totalItems = 0;
        let completedItems = 0;

        task.checklists.forEach((checklist) => {
            const items = checklist.items || [];
            if (items.length > 0) {
                totalItems += items.length;
                completedItems += items.filter((item) => item.completed).length;
            } else {
                totalItems += 1;
                if ((checklist as any).isCompleted) {
                    completedItems += 1;
                }
            }
        });

        return { completed: completedItems, total: totalItems };
    }, [task.checklists]);
    // Extract task member IDs (from task.members or task.assigned)
    const taskAssigned = (task as any).assigned;
    const taskMemberIds = useMemo(() => {
        if (task.members && Array.isArray(task.members)) {
            return task.members.map((member: any) => {
                if (typeof member === 'string') return member;
                return member._id || member.id || member.user_id;
            }).filter(Boolean);
        }
        // Fallback to task.assigned if available
        if (taskAssigned && Array.isArray(taskAssigned)) {
            return taskAssigned.map((member: any) => {
                if (typeof member === 'string') return member;
                return member._id || member.id || member.user_id;
            }).filter(Boolean);
        }
        return [];
    }, [task.members, taskAssigned]);

    // Fetch users so we can resolve member IDs to names (avoids showing object ID before refresh)
    const { data: usersData } = useTodoBoardUsers(
        { limit: 100, active: true },
        { enabled: taskMemberIds.length > 0 }
    );

    // Resolve member IDs/objects to Member format for MemberAvatarGroup (show name/initial, not raw ID)
    const membersForAvatar = useMemo(() => {
        if (!taskMemberIds.length) return [];
        const rawMembers = task.members ?? taskAssigned ?? [];
        const rawArray = Array.isArray(rawMembers) ? rawMembers : [];
        const users = usersData?.data || [];

        return taskMemberIds.map((id: string) => {
            // Prefer full object from task when API returned { _id, login, info } so we don't show ID
            const raw = rawArray.find((m: any) => (typeof m === 'string' ? m : m?._id || m?.id) === id) as any;
            if (raw && typeof raw === 'object' && raw !== null) {
                const name = raw.info?.name ?? raw.login ?? raw.name;
                if (name) return { id, name, login: raw.login };
            }

            // Resolve ID via users lookup so we show "A" for Afridi instead of object ID
            const user = users.find((u: any) => u._id === id);
            if (user) {
                const name = user.info?.name || user.login || 'Unknown';
                return { id, name, login: user.login };
            }

            return { id, name: '…', login: undefined };
        });
    }, [taskMemberIds, task.members, taskAssigned, usersData?.data]);

    // Extract all member IDs from subTasks (checklists and checklist items) for task-level validation
    const subTaskMemberIds = useMemo(() => {
        const allSubTaskMemberIds: string[] = [];
        const subTasks = (task as any).subTask || task.checklists || [];

        if (Array.isArray(subTasks)) {
            subTasks.forEach((st: any) => {
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
    }, [task]);

    if (task?.dates === undefined && attachments.length === 0 && task?.members?.length === 0 && task?.checklists?.length === 0) return null;

    return (
        <>
            <div className="border-ocean-2/50 flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-black/80">
                    {/* Checklist Progress Count - Show only when checklist is open */}
                    {checklistProgress.total > 0 && showCloseChecklist && (
                        <div className="flex items-center gap-1">
                            <CheckSquare2 className="h-3.5 w-3.5 text-gray-500" />
                            <p className="pt-1">
                                {checklistProgress.completed}/{checklistProgress.total}
                            </p>
                        </div>
                    )}

                    {/* Description, Comment, Checklist, Date, and Attachment Icons - Show when sections are not open */}
                    {!showDescriptionIcon && !showComments && !showChecklist && (
                        <div className="flex items-center gap-1">
                            {/* Checklist Icon - Most actionable, put first */}
                            {onOpenChecklist && !hideBoardFeatures && (
                                <Button
                                    size="xs"
                                    variant="plain"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onOpenChecklist();
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                    className="flex items-center gap-1 rounded-md bg-green-500/10 px-1 py-1 text-green-500 transition-colors hover:bg-green-500/20"
                                    title="Add checklist"
                                    icon={<CheckSquare className="h-3.5 w-3.5" />}
                                >
                                    {checklistProgress.total > 0 && (
                                        <span className="text-[11px] text-gray-500">
                                            {checklistProgress.completed}/{checklistProgress.total}
                                        </span>
                                    )}
                                </Button>
                            )}

                            {/* Comment Icon - Communication, put second */}
                            {onOpenComments && !hideBoardFeatures && (
                                <Button
                                    size="xs"
                                    variant="plain"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onOpenComments();
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                    className="rounded-md bg-indigo-500/10 p-1 text-indigo-500 transition-colors hover:bg-indigo-500/20"
                                    title="View comments"
                                    icon={<MessageSquare className="h-3.5 w-3.5" />}
                                />
                            )}

                            {/* Date Button - Important info, put third */}
                            {formattedDate ? (
                                <div
                                    ref={dateButtonRef as any}

                                    className={`flex items-center flex-nowrap whitespace-nowrap gap-0.5 ${dateButtonColor} px-1 rounded-xs py-0.5 text-xs font-medium `}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setDatesDropdownOpen(true);
                                    }}

                                >
                                    <Clock className={`h-2.5 w-2.5 ${dateButtonColor}`} />
                                    {formattedDate}
                                </div>
                            ) : (
                                <>
                                    {!hideBoardFeatures && (
                                        <Button
                                            ref={dateButtonRef}
                                            size="xs"
                                            variant="plain"
                                            className="flex items-center gap-1 px-1.5 py-0.5 text-xxs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setDatesDropdownOpen(true);
                                            }}
                                            icon={<Clock className="h-2.5 w-2.5" />}
                                        >
                                            Date
                                        </Button>
                                    )}
                                </>
                            )}

                            {task.task_type && (

                                <TaskTypeBadge taskType={task.task_type} />

                            )}

                            {/* Attachment Count - Reference material, put fourth */}
                            {attachments.length > 0 && !hideBoardFeatures && (
                                <Button
                                    size="xs"
                                    variant="plain"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        openAttachmentsPreview(0);
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                    className="flex items-center gap-1 px-1 py-0.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                    title={`${attachments.length} attachment${attachments.length > 1 ? 's' : ''}`}
                                    icon={<FileText className="h-3.5 w-3.5" />}
                                >
                                    {attachments.length}
                                </Button>
                            )}
                        </div>
                    )}

                </div>

                {/* Close Comments Button - Shows when comments are open */}
                {showCloseComments && onCloseComments && (
                    <Button
                        size="xs"
                        variant="plain"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onCloseComments();
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                        className="rounded-md bg-gray-500/10 p-1 text-gray-500 transition-colors hover:bg-gray-500/20"
                        title="Close comments"
                        icon={<X className="h-3.5 w-3.5" />}
                    />
                )}

                {/* Close Checklist Button - Shows when checklist is open */}
                {showCloseChecklist && onCloseChecklist && (
                    <Button
                        size="xs"
                        variant="plain"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onCloseChecklist();
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                        className="rounded-md bg-gray-500/10 p-1 text-gray-500 transition-colors hover:bg-gray-500/20"
                        title="Close checklist"
                        icon={<X className="h-3.5 w-3.5" />}
                    />
                )}

                {/* Member Avatars - Hidden when description box or comments are open */}
                {!hideInteractiveElements && !hideBoardFeatures && (
                    <div ref={membersSectionRef} className="flex items-center min-h-[24px]">
                        {membersForAvatar.length > 0 ? (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setMembersDropdownOpen(true);
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                className="cursor-pointer flex items-center"
                            >
                                <MemberAvatarGroup
                                    members={membersForAvatar}
                                    maxCount={2}
                                    size={20}
                                    className="shrink-0 flex items-center"
                                    onOmittedAvatarClick={() => setMembersDropdownOpen(true)}
                                />
                            </div>
                        ) : (
                            <Button
                                size="xs"
                                variant="plain"
                                shape="circle"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setMembersDropdownOpen(true);
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                className="h-5 w-5 border border-dashed border-gray-300 bg-gray-100 text-gray-400 transition-colors hover:border-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center"
                                title="Add member"
                            >
                                <span className="text-xs">+</span>
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Unified Member Assignment Dropdown */}
            {boardId && !hideBoardFeatures && (
                <UnifiedMemberAssignment
                    isOpen={membersDropdownOpen}
                    onClose={() => setMembersDropdownOpen(false)}
                    triggerRef={membersSectionRef as React.RefObject<HTMLElement>}
                    context="task"
                    taskId={task.id}
                    boardId={boardId}
                    assignedMemberIds={taskMemberIds}
                    subTaskMemberIds={subTaskMemberIds}
                    autoSave={true}
                    onTaskUpdated={onTaskUpdated}
                />
            )}

            {/* Dates Dropdown */}
            {task.id && !hideBoardFeatures && (
                <DatesDropdown
                    isOpen={datesDropdownOpen}
                    onClose={() => setDatesDropdownOpen(false)}
                    triggerRef={dateButtonRef as React.RefObject<HTMLElement>}
                    taskId={task.id}
                    dates={taskDates}
                    onSave={handleSaveDates}
                    onRemove={handleRemoveDates}
                    stopPropagation={true}
                />
            )}

            <DocumentPreviewDialog
                {...documentPreview.dialogProps}
                title="Document Preview"
                showNavigation={previewAttachments.length > 1}
                currentIndex={currentAttachmentIndex}
                totalFiles={previewAttachments.length}
                onNext={handleNextAttachment}
                onPrevious={handlePreviousAttachment}
            />
        </>
    );
};
