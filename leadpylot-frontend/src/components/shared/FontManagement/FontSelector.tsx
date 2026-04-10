'use client';

import React, { useState } from 'react';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { HiFolderOpen } from 'react-icons/hi';
import { useFontOptions } from '@/services/hooks/useFontManagement';
import FontManager from './FontManager';

interface FontSelectorProps {
  value?: string | null;
  onChange: (fontFamily: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showManagement?: boolean;
}

const FontSelector: React.FC<FontSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select font...',
  disabled = false,
  showManagement = true,
}) => {
  const [showFontManager, setShowFontManager] = useState(false);
  const { data: fontOptions, isLoading } = useFontOptions();

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'manage_fonts') {
      setShowFontManager(true);
      return;
    }

    onChange(selectedValue === '' ? null : selectedValue);
  };

  const handleFontSelect = (fontFamily: string) => {
    onChange(fontFamily);
    setShowFontManager(false);
  };

  // Prepare options for the select component
  const selectOptions = React.useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];

    if (fontOptions?.data?.font_options) {
      // Add font options
      fontOptions.data?.font_options?.forEach((option) => {
        options.push({
          value: option?.value || '',
          label: option?.label,
        });
      });

      // Add management options if enabled
      if (showManagement) {
        options.push(
          { value: '---', label: '───────────────' }, // Separator
          { value: 'manage_fonts', label: '📁 Manage Fonts...' }
        );
      }
    }

    return options;
  }, [fontOptions, showManagement]);

  const selectedOption = selectOptions?.find((option) => option?.value === (value || ''));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 shrink-0">
          <Select
            value={selectedOption}
            onChange={(option) => handleSelectChange(option?.value || '')}
            options={selectOptions}
            placeholder={placeholder}
            isDisabled={disabled || isLoading}
            getOptionValue={(option) => option?.value}
            getOptionLabel={(option) => option?.label}
            isOptionDisabled={(option) => option?.value === '---'}
            isMulti={false}
            isClearable={true}
          />
        </div>

        {showManagement && (
          <Button
            variant="default"
            icon={<HiFolderOpen />}
            onClick={() => setShowFontManager(true)}
            disabled={disabled}
          >
            Browse
          </Button>
        )}
      </div>

      {/* Font Manager Dialog */}
      <Dialog
        isOpen={showFontManager}
        onClose={() => setShowFontManager(false)}
        className="!h-[80vh] !max-h-none !w-[80vw] !max-w-none"
        contentClassName="p-0"
      >
        <FontManager
          onFontSelect={handleFontSelect}
          selectedFont={value || undefined}
          showActions={true}
        />
      </Dialog>
    </>
  );
};

export default FontSelector;
