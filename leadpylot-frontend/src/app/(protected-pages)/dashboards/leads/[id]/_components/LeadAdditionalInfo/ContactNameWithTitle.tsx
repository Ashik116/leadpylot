import React, { useState } from 'react';

import InlineEditField from '@/components/shared/InlineEditField';
import classNames from '@/utils/classNames';
import CustomSelect from '@/components/shared/CustomSelect';

interface ContactNameWithTitleProps {
  nameValue: string;
  titleValue: string;
  onNameSave: (newValue: string) => Promise<void>;
  onTitleSave: (newValue: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
  isAdmin?: boolean;
}

const TITLE_OPTIONS = [
  { value: 'Herr', label: 'Herr' },
  { value: 'Frau', label: 'Frau' },
];

const ContactNameWithTitle = ({
  nameValue,
  titleValue,
  onNameSave,
  onTitleSave,
  disabled = false,
  className = '',
  isAdmin = true,
}: ContactNameWithTitleProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleTitleChange = async (option: any) => {
    const newValue = option?.value || '';
    if (newValue !== titleValue) {
      await onTitleSave(newValue);
    }
    setIsEditingTitle(false);
  };

  return (
    <div className={classNames('flex items-center gap-1', className)}>
      {isEditingTitle && !disabled && isAdmin ? (
        <CustomSelect
          options={TITLE_OPTIONS}
          value={TITLE_OPTIONS.find((opt) => opt.value === titleValue)}
          onChange={handleTitleChange}
          menuIsOpen={true}
          className="max-w-12"
          onBlur={() => setIsEditingTitle(false)}
        />
      ) : (
        <span
          className={classNames(
            'cursor-pointer rounded text-sm font-normal text-black transition-colors hover:bg-gray-100'
          )}
          onDoubleClick={() => !disabled && isAdmin && setIsEditingTitle(true)}
          title="Double-click to edit title"
        >
          {titleValue || 'Title :'}
        </span>
      )}

      <InlineEditField
        value={nameValue}
        onSave={onNameSave}
        placeholder="Enter contact name"
        disabled={disabled}
        className="flex-1 font-normal"
      />
    </div>
  );
};

export default ContactNameWithTitle;
