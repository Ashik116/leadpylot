'use client';

import React, { useState, useRef, useEffect } from 'react';

interface EditableTitleProps {
    value: string;
    onSave: (newValue: string) => void | Promise<void>;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    /** When true, show full title with wrapping (e.g. in modals). When false, truncate to one line. */
    showFullTitle?: boolean;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({
    value,
    onSave,
    placeholder = '',
    className = '',
    inputClassName = '',
    showFullTitle = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [inputWidth, setInputWidth] = useState(100);

    // Auto-focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Measure text width and update input width
    useEffect(() => {
        if (isEditing && measureRef.current && containerRef.current) {
            // Use requestAnimationFrame to ensure DOM is updated
            requestAnimationFrame(() => {
                if (measureRef.current && containerRef.current) {
                    const textWidth = measureRef.current.offsetWidth;
                    const parentWidth = containerRef.current.parentElement?.offsetWidth || containerRef.current.offsetWidth;
                    const maxWidth = parentWidth - 20; // Leave some margin
                    const calculatedWidth = textWidth + 20; // Add padding
                    // Constrain width between minimum and maximum
                    setInputWidth(Math.max(100, Math.min(calculatedWidth, maxWidth)));
                }
            });
        }
    }, [editValue, isEditing]);

    const handleDoubleClick = () => {
        setEditValue(value);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (editValue.trim() !== value.trim()) {
            await onSave(editValue.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const handleBlur = () => {
        handleSave();
    };

    if (isEditing) {
        return (
            <div ref={containerRef} className={`relative inline-block max-w-full ${className}`}>
                {/* Hidden span for width measurement */}
                <span
                    ref={measureRef}
                    className={`absolute whitespace-pre ${inputClassName}`}
                    style={{
                        visibility: 'hidden',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        whiteSpace: 'pre',
                    }}
                >
                    {editValue || placeholder}
                </span>
                {/* Input field */}
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    className={`border border-gray-300 rounded px-1 bg-transparent focus:ring focus:ring-black focus:border-black focus:outline-none ${inputClassName}`}
                    style={{ width: `${inputWidth}px`, minWidth: '100px', maxWidth: '100%' }}
                />
            </div>
        );
    }

    return (
        <div
            onDoubleClick={handleDoubleClick}
            className={`cursor-pointer ${showFullTitle ? 'break-words' : 'line-clamp-1 truncate'} ${className}`}
            title="Double-click to edit"
        >
            <span className={inputClassName}>
                {value || <span className="text-gray-400">{placeholder}</span>}
            </span>
        </div>
    );
};
