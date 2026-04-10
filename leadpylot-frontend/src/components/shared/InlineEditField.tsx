import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import classNames from '@/utils/classNames';
import { useSession } from '@/hooks/useSession';
import { useState, useCallback, useRef, useEffect } from 'react';

interface InlineEditFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'number';
  className?: string;
  enableInlineEditing?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  // Batch mode props
  batchMode?: boolean;
  onBatchChange?: (fieldKey: string, value: string) => void;
  fieldKey?: string;
  hasPendingChanges?: boolean;
  textClassName?: string;
}

const InlineEditField = ({
  value,
  onSave,
  placeholder = 'Enter value',
  type = 'text',
  className = '',
  enableInlineEditing = true,
  disabled = false,
  children,
  batchMode = false,
  onBatchChange,
  fieldKey,
  hasPendingChanges = false,
  textClassName,
}: InlineEditFieldProps) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalValue, setOriginalValue] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Initialize with current value
  useEffect(() => {
    if (value) {
      setOriginalValue(value);
      setEditValue(value);
    }
  }, [value]);

  // Check if there are changes
  useEffect(() => {
    setHasChanges(editValue !== originalValue);
  }, [editValue, originalValue]);

  // Calculate input width based on content
  const getInputWidth = useCallback(() => {
    if (!measureRef.current) return 'auto';

    // Create a temporary span to measure text width
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.fontSize = getComputedStyle(measureRef.current).fontSize;
    tempSpan.style.fontFamily = getComputedStyle(measureRef.current).fontFamily;
    tempSpan.style.fontWeight = getComputedStyle(measureRef.current).fontWeight;
    tempSpan.textContent = editValue || placeholder;

    document.body.appendChild(tempSpan);
    const width = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan);

    // Add some padding and set minimum/maximum width based on content type
    const paddedWidth = width + 6;
    // const minWidth = type === 'email' ? 140 : 50;
    // const maxWidth = type === 'email' ? 140 : type === 'text' ? 150 : 150;

    return Math.max(Math.min(paddedWidth)) + 'px';
  }, [editValue, placeholder, type]);

  // Handle double-click to start editing
  const handleDoubleClick = useCallback(() => {
    if (!enableInlineEditing || !isAdmin || disabled) return;

    setIsEditing(true);
    setEditValue(value || '');

    // Focus input after a brief delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  }, [enableInlineEditing, isAdmin, disabled, value]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setEditValue(e.target.value);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    if (batchMode && onBatchChange && fieldKey) {
      // In batch mode, just update the pending changes
      onBatchChange(fieldKey, editValue);
      setOriginalValue(editValue);
      setHasChanges(false);
      setIsEditing(false);
      return;
    }

    // In individual save mode, call the API
    setIsSaving(true);
    try {
      await onSave(editValue);
      setOriginalValue(editValue);
      setHasChanges(false);
      setIsEditing(false);

      //   toast.push(<Notification type="success">Updated successfully</Notification>);
    } catch {
      toast.push(<Notification type="danger">Failed to update</Notification>);
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, editValue, onSave, batchMode, onBatchChange, fieldKey]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(originalValue);
    setHasChanges(false);
  }, [originalValue]);

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  // Prevent context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!isAdmin) {
        e.preventDefault();
        toast.push(<Notification type="warning">Please use the copy button.</Notification>);
      }
    },
    [isAdmin]
  );

  // Prevent text selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isAdmin) {
        e.preventDefault();
      }
    },
    [isAdmin]
  );

  if (isEditing) {
    return (
      <div className="relative max-h-min min-h-6">
        {/* Hidden measurement div */}
        <div
          ref={measureRef}
          className={classNames('absolute hidden text-sm  text-black', className)}
        >
          {editValue || placeholder}
        </div>

        {/* Inline input - positioned exactly where text was */}
        <input
          ref={inputRef}
          value={editValue}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onBlur={() => {
            // Auto-save on blur if there are changes
            if (hasChanges) {
              handleSave();
            } else {
              handleCancel();
            }
          }}
          type={type}
          placeholder={placeholder}
          style={{
            width: getInputWidth(),
          }}
          className={classNames(
            'absolute inset-0 w-fit rounded border-[0.1px] border-gray-900 bg-white text-sm font-medium transition-colors outline-none',
            isSaving && 'cursor-wait opacity-50',
            className,
            textClassName,
            type === 'number' && 'min-w-8'
          )}
        />

        {/* Loading indicator */}
        {isSaving && (
          <div className="absolute top-1/2 -right-6 flex -translate-y-1/2 items-center">
            <ApolloIcon name="loading" className="animate-spin text-sm text-blue-500" />
          </div>
        )}
      </div>
    );
  }

  if (enableInlineEditing && isAdmin && !disabled) {
    return (
      <div className="group relative max-h-min min-h-6">
        <div
          ref={measureRef}
          className={classNames(
            '3xl:text-sm flex flex-1 cursor-pointer items-center truncate rounded py-1 text-sm font-medium transition-all',

            value && '',
            (hasChanges || hasPendingChanges) && 'border-blue-300 bg-blue-50',
            className
          )}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onMouseDown={handleMouseDown}
          title={
            hasChanges || hasPendingChanges
              ? `${value} (Double-click to edit - has pending changes)`
              : `${value} (Double-click to edit)`
          }
        >
          <div className={classNames(textClassName, 'w-full truncate leading-none')}>
            {children || value || (
              <span className="truncate text-sm text-gray-400">{placeholder}</span>
            )}
          </div>
          {(hasChanges || hasPendingChanges) && (
            <span className="ml-1 text-sm text-blue-600">●</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative max-h-min min-h-6">
    <div
      ref={measureRef}
      className={classNames(
        '3xl:text-sm flex flex-1 cursor-pointer items-center truncate rounded py-1 text-sm font-medium transition-all',

        value && '',
        (hasChanges || hasPendingChanges) && 'border-blue-300 bg-blue-50',
        className
      )}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      title={
        hasChanges || hasPendingChanges
          ? `${value} (Double-click to edit - has pending changes)`
          : `${value} (Double-click to edit)`
      }
    >
      <div className={classNames(textClassName, 'w-full truncate leading-none')}>
        {children || value || (
          <span className="truncate text-sm text-gray-400">{placeholder}</span>
        )}
      </div>
      {(hasChanges || hasPendingChanges) && (
        <span className="ml-1 text-sm text-blue-600">●</span>
      )}
    </div>
  </div>
  );
};

export default InlineEditField;
