'use client';

import React, { memo, useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import ApolloIcon from '@/components/ui/ApolloIcon';
import CommentAttachmentUpload from '@/app/(protected-pages)/dashboards/mails/_components/InternalComments/CommentAttachmentUpload';
import RichTextEditor from '@/components/shared/RichTextEditor/RichTextEditor';
import { MAX_DESCRIPTION_LENGTH, MAX_FILE_SIZE } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/TicketModal.constants';
import { formatFileSize } from '@/utils/documentUtils';
import TodoTypeDialog from '@/app/(protected-pages)/dashboards/leads/[id]/_components/TodoTypeDialog';
import { useTicketModal } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/hooks/useTicketModal';
import { TaskType } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/RightSidebar/UpdatesFilterTabs';
import { useBoardMembers } from '@/services/hooks/useBoardMembers';

export interface TicketFormProps {
    leadId: string;
    emailId?: string;
    offers?: any[];
    opening?: any;
    dashboardType?: 'offer' | 'opening' | 'lead';
    taskType?: string;
    onClose?: () => void;
    isOpen?: boolean;
    variant?: 'modal' | 'inline';
}

const TicketForm = memo<TicketFormProps>(({
    leadId,
    emailId,
    offers = [],
    opening,
    dashboardType,
    taskType,
    onClose = () => { },
    isOpen = true,
    variant = 'inline',
}) => {
    // TodoTypeDialog state management
    const [isTodoTypeDialogOpen, setIsTodoTypeDialogOpen] = useState(false);
    const [todoTypeDialogType, setTodoTypeDialogType] = useState<'create' | 'edit' | null>(null);
    const [selectedTodoTypeId, setSelectedTodoTypeId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Use Task modal hook for all business logic
    const {
        selectedTicketTypes,
        description,
        uploadedDocumentIds,
        selectedOfferFiles,
        taskDescription,
        selectedAssignedIds,
        isLoadingTicketTypes,
        activeTicketTypes,
        offerFiles,
        isValid,
        isCreating,
        handleTicketTypeToggle,
        handleDocumentIdsChange,
        handleOfferFilesChange,
        handleAssignedChange,
        handleDescriptionChange,
        handleTaskDescriptionChange,
        handleSave,
        handleDiscard,
        refetchTodoTypes,
    } = useTicketModal({
        isOpen,
        leadId,
        emailId,
        taskType: taskType as TaskType,
        onClose,
        offers,
        opening,
        dashboardType,
    });

    const { data: boardMembersData, isLoading: isLoadingBoardMembers } = useBoardMembers(
        taskType,
        { enabled: !!isOpen && !!taskType }
    );
    const boardMembers = boardMembersData?.data ?? [];

    // TodoTypeDialog handlers
    const handleCreateMoreClick = () => {
        setTodoTypeDialogType('create');
        setSelectedTodoTypeId(null);
        setIsTodoTypeDialogOpen(true);
    };

    const handleEditTodoType = (todoTypeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTodoTypeDialogType('edit');
        setSelectedTodoTypeId(todoTypeId);
        setIsTodoTypeDialogOpen(true);
    };

    const handleTodoTypeDialogClose = () => {
        setIsTodoTypeDialogOpen(false);
        setTodoTypeDialogType(null);
        setSelectedTodoTypeId(null);
    };

    const handleTodoTypeDialogSuccess = () => {
        refetchTodoTypes();
        handleTodoTypeDialogClose();
    };

    const isModalVariant = variant === 'modal';
    const isEmailContext = !!emailId;
    const shouldShowDetailsForm = isEmailContext || selectedTicketTypes.length !== 1;
    const containerClass = isModalVariant
        ? 'flex flex-1 overflow-hidden'
        : 'flex overflow-hidden';
    const sidebarClass = isModalVariant
        ? 'flex w-80 flex-col border-r border-gray-200 bg-gray-50 p-3'
        : 'flex w-80 flex-col border-r border-gray-200 bg-gray-50 p-3';
    const contentClass = isModalVariant
        ? `flex-1 overflow-y-auto p-3 ${isEmailContext ? 'w-full' : ''}`
        : `flex-1 overflow-y-auto p-3 ${isEmailContext ? 'w-full' : ''}`;
    const footerClass = isModalVariant
        ? 'flex items-center justify-between border-t border-gray-200 bg-gray-50 px-2 pt-2'
        : 'flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3';

    return (
        <>
            <div className={containerClass}>
                {/* Left Sidebar - Task Types */}
                {!isEmailContext && (
                    <div className={sidebarClass}>
                        <div className="relative mb-3 shrink-0 text-sm text-gray-600">
                            <p className="font-medium">Predefined Tasks <span className="text-gray-400">(optional)</span></p>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {isLoadingTicketTypes ? (
                                <div className="text-sm text-gray-500">Loading Task types...</div>
                            ) : activeTicketTypes.length === 0 ? (
                                <div className="text-sm text-gray-500">No active Task types available</div>
                            ) : (
                                <div className="space-y-2">
                                    {activeTicketTypes.map((ticketType) => (
                                        <div
                                            key={ticketType._id}
                                            className="group rounded-lg border border-gray-200 bg-white p-1 transition-colors hover:border-amber-300"
                                        >
                                            <div
                                                onClick={() => handleTicketTypeToggle(ticketType._id)}
                                                className="flex cursor-pointer items-center gap-2"
                                            >
                                                <Checkbox checked={selectedTicketTypes.includes(ticketType._id)} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {ticketType.taskTitle || 'Untitled Task'}
                                                    </div>
                                                </div>
                                               
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button
                            size="xs"
                            variant="solid"
                            icon={<ApolloIcon name="plus" />}
                            className={isModalVariant ? "mt-2" : "mt-2"}
                            onClick={handleCreateMoreClick}
                        >
                            Create More
                        </Button>
                    </div>
                )}

                {/* Right Main Content */}
                <div className={contentClass}>
                    {shouldShowDetailsForm ? (
                        <div className="space-y-4">
                            {/* Title */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={description}
                                    onChange={handleDescriptionChange}
                                    maxLength={MAX_DESCRIPTION_LENGTH}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                                    placeholder="Task title"
                                />
                                <p className="text-xs text-gray-500">
                                    {description.length}/{MAX_DESCRIPTION_LENGTH} characters
                                </p>
                            </div>

                            {/* Assigned members (multi-select) - when taskType is set (including email from EmailDetailsModal) */}
                            {taskType && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Assigned <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <Select
                                        isMulti
                                        placeholder={isLoadingBoardMembers ? 'Loading members...' : 'Select members'}
                                        options={boardMembers.map((m) => ({
                                            value: m._id,
                                            label: m.name || m.login || m.email || m._id,
                                        }))}
                                        value={boardMembers
                                            .filter((m) => selectedAssignedIds.includes(m._id))
                                            .map((m) => ({
                                                value: m._id,
                                                label: m.name || m.login || m.email || m._id,
                                            }))}
                                        onChange={(selected: unknown) => {
                                            const arr = Array.isArray(selected) ? selected : [];
                                            handleAssignedChange(arr.map((o: { value: string }) => o.value));
                                        }}
                                        selectMultipleOptions
                                        className="w-full"
                                        instanceId="assigned-members-select"
                                        menuPortalTarget={isModalVariant && typeof document !== 'undefined' ? document.body : undefined}
                                    />
                                    {selectedAssignedIds.length > 0 && (
                                        <p className="text-xs text-gray-500">
                                            {selectedAssignedIds.length} member{selectedAssignedIds.length !== 1 ? 's' : ''} selected
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            {!isEmailContext && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Description <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <RichTextEditor
                                        content={taskDescription || ''}
                                        onChange={(content) => handleTaskDescriptionChange(content.html)}
                                        placeholder="Enter Task description..."
                                    />
                                </div>
                            )}

                            {/* Attachments */}
                            {!isEmailContext && (
                                <div className="space-y-2">
                                    {/* Offer Files Section */}
                                    {offerFiles.length > 0 ? (
                                        <div className="space-y-2 border-t border-gray-200 pt-3">
                                            <label className="block text-xs font-medium text-gray-700">
                                                Files from Offers <span className="text-gray-400">(Optional)</span>
                                            </label>
                                            <Select
                                                isMulti
                                                placeholder="Select offer files"
                                                options={offerFiles.map((file) => ({
                                                    value: file._id,
                                                    label: `${file.filename}${file.offerReference ? ` (${file.offerReference})` : ''} - ${formatFileSize(file.size)}`,
                                                    file,
                                                }))}
                                                value={offerFiles
                                                    .filter((file) => selectedOfferFiles.includes(file._id))
                                                    .map((file) => ({
                                                        value: file._id,
                                                        label: `${file.filename}${file.offerReference ? ` (${file.offerReference})` : ''} - ${formatFileSize(file.size)}`,
                                                        file,
                                                    }))}
                                                onChange={(selectedOptions: any) => {
                                                    if (Array.isArray(selectedOptions)) {
                                                        const selectedIds = selectedOptions.map((option: any) => option.value);
                                                        handleOfferFilesChange(selectedIds);
                                                    } else {
                                                        handleOfferFilesChange([]);
                                                    }
                                                }}
                                                selectMultipleOptions
                                                className="w-full"
                                                instanceId="offer-files-select"
                                                menuPortalTarget={isModalVariant && typeof document !== 'undefined' ? document.body : undefined}
                                            />
                                            <p className="text-xs text-gray-500">
                                                {selectedOfferFiles.length} of {offerFiles.length} files selected
                                            </p>
                                        </div>
                                    ) : null}
                                    <label className="block text-sm font-medium text-gray-700">
                                        Attachments <span className="text-gray-400">(optional)</span>
                                    </label>
                                    <CommentAttachmentUpload
                                        value={uploadedDocumentIds}
                                        onChange={handleDocumentIdsChange}
                                        maxFileSize={MAX_FILE_SIZE}
                                        label="Upload"
                                        onUploadStateChange={setIsUploading}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500 text-center">
                           Single selected task will be used to create this task. and it will use {`it's`} title as the task title.
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className={footerClass}>
                {!isEmailContext && (
                    <div className="text-xs text-gray-500">
                        {selectedTicketTypes.length > 0 && (
                            <span>
                                {selectedTicketTypes.length} Task type
                                {selectedTicketTypes.length !== 1 ? 's' : ''} selected
                            </span>
                        )}
                    </div>
                )}
                <div className={`flex gap-3 ${isEmailContext ? 'w-full justify-end' : ''}`}>
                    <Button type="button" variant="plain" onClick={handleDiscard} className="px-6">
                        Discard
                    </Button>
                    <Button
                        type="button"
                        variant="solid"
                        onClick={handleSave}
                        disabled={!isValid || isCreating || isUploading}
                        loading={isCreating}
                        icon={<ApolloIcon name="check-circle" />}
                    >
                        {isCreating ? 'Creating...' : 'Create Task'}
                    </Button>
                </div>
            </div>

            {/* Todo Type Create/Edit Dialog */}
            {todoTypeDialogType && (
                <TodoTypeDialog
                    isOpen={isTodoTypeDialogOpen}
                    onClose={handleTodoTypeDialogClose}
                    type={todoTypeDialogType}
                    todoTypeId={selectedTodoTypeId || undefined}
                    onSuccess={handleTodoTypeDialogSuccess}
                />
            )}
        </>
    );
});

TicketForm.displayName = 'TicketForm';

export default TicketForm;
