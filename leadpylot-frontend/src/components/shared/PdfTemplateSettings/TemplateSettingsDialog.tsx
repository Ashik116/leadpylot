import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { FontSelector } from '@/components/shared/FontManagement';
import { PdfTemplate } from '@/services/PdfTemplateService';

interface TemplateSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: PdfTemplate | null;
  onSave: (settings: any) => void;
}

const TemplateSettingsDialog: React.FC<TemplateSettingsDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSave,
}) => {
  const [settings, setSettings] = useState({
    default_font: null as string | null,
    auto_flatten: true,
    allow_editing: false,
    font_size_adjustment: true,
    debug_mode: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template?.settings) {
      setSettings({
        default_font: template.settings.default_font || null,
        auto_flatten: template.settings.auto_flatten ?? true,
        allow_editing: template.settings.allow_editing ?? false,
        font_size_adjustment: template.settings.font_size_adjustment ?? true,
        debug_mode: template.settings.debug_mode ?? false,
      });
    }
  }, [template]);

  const handleSave = async () => {
    if (!template) return;

    setIsSaving(true);
    try {
      await onSave({
        ...template.settings,
        ...settings,
      });

      toast.push(
        <Notification type="success" title="Settings Updated">
          Template &quot;{template.name}&quot; settings updated successfully
        </Notification>
      );
      
      onClose();
    } catch {
      toast.push(
        <Notification type="danger" title="Update Failed">
          Failed to update template settings
        </Notification>
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width="2xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold">Template Settings</h3>
          <p className="text-gray-600">
            Configure global settings for &quot;{template?.name}&quot;
          </p>
        </div>

        {/* Font Settings Section */}
        <Card className="p-4 space-y-4">
          <h4 className="font-medium text-gray-900">🎨 Font Settings</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Font for Entire PDF
            </label>
            <FontSelector
              value={settings.default_font}
              onChange={(fontFamily) => 
                setSettings(prev => ({ ...prev, default_font: fontFamily }))
              }
              placeholder="Auto (PDF default font)"
            />
            <p className="text-xs text-gray-500 mt-1">
              This font will be applied to all fields unless overridden individually. 
              Perfect for brand fonts like &quot;Allianz Neo&quot;.
            </p>  
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Auto Font Size Adjustment
              </label>
              <p className="text-xs text-gray-500">
                Automatically adjust font size based on content length
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.font_size_adjustment}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, font_size_adjustment: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
          </div>
        </Card>

        {/* PDF Behavior Settings */}
        <Card className="p-4 space-y-4">
          <h4 className="font-medium text-gray-900">📄 PDF Behavior</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Auto Flatten PDF
              </label>
              <p className="text-xs text-gray-500">
                Remove form fields after filling (recommended for final documents)
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.auto_flatten}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, auto_flatten: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Allow PDF Editing
              </label>
              <p className="text-xs text-gray-500">
                Keep form fields editable after generation
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.allow_editing}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, allow_editing: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
          </div>
        </Card>

        {/* Debug Settings */}
        <Card className="p-4 space-y-4">
          <h4 className="font-medium text-gray-900">🔧 Debug Options</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Debug Mode
              </label>
              <p className="text-xs text-gray-500">
                Include debug information in PDF generation logs
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.debug_mode}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, debug_mode: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
          </div>
        </Card>

        {/* Current Font Preview */}
        {settings.default_font && (
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-2">Font Preview</h4>
            <div 
              className="text-lg p-3 bg-gray-50 rounded border"
              style={{ fontFamily: settings.default_font }}
            >
              Sample text with {settings.default_font} font
              <br />
              <span className="text-sm">
                The quick brown fox jumps over the lazy dog 1234567890
              </span>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="solid" 
            onClick={handleSave}
            loading={isSaving}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default TemplateSettingsDialog;