'use client';

import UserColorPicker from '@/app/(protected-pages)/admin/users/_components/UserColorPicker';
import Button from '@/components/ui/Button';
import Popover from '@/components/ui/Popover';
import { useState } from 'react';

function sourceColorToPickerHex(value: string | null | undefined): string {
  if (!value) return '#6366f1';
  const v = value.trim();
  const m6 = /^#([0-9A-Fa-f]{6})$/i.exec(v);
  if (m6) return v.toLowerCase();
  const m3 = /^#([0-9A-Fa-f]{3})$/i.exec(v);
  if (m3) {
    const [r, g, b] = m3[1];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const m8 = /^#([0-9A-Fa-f]{8})$/i.exec(v);
  if (m8) return `#${m8[1].slice(0, 6)}`.toLowerCase();
  return '#6366f1';
}

function normalizeHexForCompare(value: string | null | undefined): string {
  if (value === undefined || value === null || !String(value).trim()) return '';
  let s = String(value).trim().toLowerCase();
  if (!s.startsWith('#')) s = `#${s}`;
  const m3 = /^#([0-9a-f]{3})$/i.exec(s);
  if (m3) {
    const [r, g, b] = m3[1];
    s = `#${r}${r}${g}${g}${b}${b}`;
  }
  const m8 = /^#([0-9a-f]{8})$/i.exec(s);
  if (m8) s = `#${m8[1].slice(0, 6)}`;
  const m6 = /^#([0-9a-f]{6})$/i.exec(s);
  return m6 ? s : '';
}

function colorsMatchServer(server: string | null | undefined, pickerHex: string): boolean {
  const next = pickerHex.trim() === '' ? '' : pickerHex;
  return normalizeHexForCompare(server) === normalizeHexForCompare(next || undefined);
}

export type SourceColorTableCellProps = {
  sourceId: string;
  sourceName?: string;
  color: string | null | undefined;
  /** Pass mutate options so the cell can close the popover after a successful save. */
  onSaveColor: (
    id: string,
    nextColor: string | null,
    mutateOptions?: { onSuccess?: () => void }
  ) => void;
  isSaving: boolean;
};

export function SourceColorTableCell({
  sourceId,
  sourceName,
  color,
  onSaveColor,
  isSaving,
}: SourceColorTableCellProps) {
  const hasServerColor = Boolean(color?.trim());
  const colorStr = color?.trim() ?? '';

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [localHex, setLocalHex] = useState(() => sourceColorToPickerHex(color));
  const [dirty, setDirty] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (open) {
      setLocalHex(sourceColorToPickerHex(color));
      setDirty(false);
    }
  };

  const sameAsServer = colorsMatchServer(color, localHex);
  const saveDisabled = !dirty || sameAsServer;

  if (!hasServerColor) {
    return (
      <span
        className="text-xs text-gray-400 dark:text-gray-500"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        -
      </span>
    );
  }

  return (
    <div
      className="flex items-center justify-start"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <Popover
        isOpen={popoverOpen}
        onOpenChange={handleOpenChange}
        placement="bottom-start"
        closeOnFocusOut={false}
        // className="dark:border-gray-700 dark:bg-gray-900"
        floatingClassName="max-w-[min(100vw-1rem,16rem)]"
        content={
          <div
            className="space-y-3 p-3"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <UserColorPicker
              value={localHex}
              onChange={(hex) => {
                setLocalHex(hex);
                setDirty(true);
              }}
              disabled={isSaving}
              label={sourceName ? `Color · ${sourceName}` : 'Color'}
            />
            <Button
              type="button"
              variant="solid"
              size="xs"
              className="w-full"
              loading={isSaving}
              disabled={saveDisabled}
              onClick={(e) => {
                e.stopPropagation();
                const payload = localHex.trim() === '' ? null : localHex;
                onSaveColor(sourceId, payload, {
                  onSuccess: () => {
                    setPopoverOpen(false);
                    setDirty(false);
                  },
                });
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        <button
          type="button"
          className="size-6 shrink-0 cursor-pointer rounded-full border border-gray-200 transition-opacity hover:opacity-90 dark:border-gray-600"
          style={{ backgroundColor: colorStr }}
          title="Edit color"
          aria-label={`Edit source color ${colorStr}`}
        />
      </Popover>
    </div>
  );
}
