import React, { useState, useEffect } from 'react';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import { Trash2, Palette } from 'lucide-react';
import { ColorGrid } from '../../_components/ColorGrid';
import { HexColorPickerControl } from '@/components/shared/HexColorPicker';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/configs/navigation.config/auth.route.config';

interface ListMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentBackgroundColor?: string;
  onDelete: () => void;
  onSetBackgroundColor: (color: string) => void;
  is_system?: boolean;
}

export const ListMenuDropdown: React.FC<ListMenuDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  currentBackgroundColor,
  onDelete,
  onSetBackgroundColor,
  is_system,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState(currentBackgroundColor || '');
  const { user } = useAuth();
  // Reset custom color when color picker is opened or currentBackgroundColor changes
  useEffect(() => {
    if (showColorPicker) {
      setTimeout(() => {
        setCustomColor(currentBackgroundColor || '');
      }, 100);
    }
  }, [showColorPicker, currentBackgroundColor]);

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const handleColorSelect = (color: string) => {
    onSetBackgroundColor(color);
    setShowColorPicker(false);
    onClose();
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
  };

  const handleCustomColorSubmit = () => {
    if (customColor) {
      handleColorSelect(customColor);
    }
  };

  const hasCustomColorChanged = customColor !== (currentBackgroundColor || '');

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={280}
      dropdownHeight={showColorPicker ? 600 : 200}
    >
      <div className="border-ocean-2/50 rounded-xl border bg-white shadow-xl">
        <div className="p-1">
          {!showColorPicker ? (
            <>
              <button
                onClick={() => setShowColorPicker(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-black transition-colors hover:bg-gray-50"
              >
                <Palette className="h-4 w-4 text-gray-500" />
                <span>Set background color</span>
              </button>

              {(!is_system || user?.role === Role.ADMIN) && (
                <>
                  <div className="bg-ocean-2/50 my-1 h-px" />
                  <button
                    onClick={handleDelete}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between px-3 py-2">
                <h3 className="text-xs font-bold tracking-widest text-black/80 uppercase">
                  Background Color
                </h3>
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="text-xs text-gray-500 transition-colors hover:text-black"
                >
                  Back
                </button>
              </div>

              <div className="space-y-4 px-2 pb-2">

                {/* Color Grid */}
                <div>
                  <ColorGrid
                    selectedColor={currentBackgroundColor}
                    onColorSelect={handleColorSelect}
                  />
                </div>

                {/* Custom Color Picker */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className=" text-xs font-semibold text-black/70">Custom Color</h4>
                    {hasCustomColorChanged && (
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="xs"
                          onClick={() => setCustomColor(currentBackgroundColor || '')}

                        >
                          Cancel
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={handleCustomColorSubmit}
                          className="flex-1"
                        >
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>
                  <HexColorPickerControl
                    value={customColor}
                    onChange={handleCustomColorChange}
                  />

                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </SmartDropdown>
  );
};
