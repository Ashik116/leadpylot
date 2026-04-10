'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import dynamic from 'next/dynamic';
import classNames from '@/utils/classNames';

const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false });

function hasEditorContent(value: string | undefined): boolean {
  const v = value ?? '';
  const stripped = v.replace(/<[^>]*>/g, '').trim();
  return stripped.length > 0;
}

export interface RichTextEditorProps {
  name: string;
  className?: string;
  placeholder?: string;
  height?: number;
  /** Callback to receive the Jodit instance for programmatic insert (e.g. insertVariable) */
  editorRef?: (editor: any) => void;
}

export function RichTextEditor({
  name,
  className,
  placeholder = 'Enter description...',
  height = 350,
  editorRef: editorRefCallback,
}: RichTextEditorProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const editor = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  const watchedValue = useWatch({ control, name, defaultValue: '' });
  const hasContent = hasEditorContent(watchedValue);

  useEffect(() => {
    const linkId = 'jodit-editor-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = '/jodit.min.css';
      document.head.appendChild(link);
    }
    setIsMounted(true);
  }, []);

  const fieldError = useMemo(() => {
    const fieldNames = name.split('.');
    let error: any = errors;
    for (const fieldName of fieldNames) {
      error = error?.[fieldName];
    }
    return error;
  }, [errors, name]);

  const isCompact = height <= 200;
  const config = useMemo(
    () => ({
      readonly: false,
      placeholder,
      height,
      disablePlugins: ['about', 'fullsize', 'add-new-line', 'source'],
      minHeight: isCompact ? 60 : 200,
      maxHeight: height <= 200 ? 200 : 1800,
      allowResizeY: !isCompact,
      toolbar: true,
      toolbarButtonSize: 'small' as const,
      toolbarAdaptive: false, // Keep same buttons on all screen sizes (was causing more options on small, fewer on big)
      // Toolbar for email templates and rich text editing
      buttons: [
        'bold',
        'italic',
        'underline',
        'strikethrough',
        'eraser',
        '|',
        'ul',
        'ol',
        '|',
        'align',
        'indent',
        'outdent',
        '|',
        'paragraph',
        'brush',
        '|',
        'link',
        'table',
        'image',
        'hr',
        '|',
        'preview',
        'undo',
        'redo',
        '|',
        // 'dots',
      ],
      showCharsCounter: false,
      showWordsCounter: false,
      showXPathInStatusbar: false,
      saveSelectionOnBlur: true,
      defaultActionOnPaste: 'insert_as_html' as const,
      askBeforePasteHTML: false,
      // Disable placeholder when content exists (fixes mount-with-content showing placeholder)
      showPlaceholder: !hasContent,
    }),
    [placeholder, height, isCompact, hasContent]
  );

  return (
    <div
      className={classNames(
        'jodit-editor-wrapper relative w-full max-w-full min-w-0 overflow-hidden',
        className
      )}
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) =>
          isMounted ? (
            <JoditEditor
              ref={editor}
              value={field.value ?? ''}
              config={config}
              onBlur={(newContent) => field.onChange(newContent)}
              onChange={() => {}}
              editorRef={editorRefCallback}
            />
          ) : (
            <div
              className="border-border bg-sand-4/50 animate-pulse rounded-sm border"
              style={{ height }}
            />
          )
        }
      />
      {fieldError && <p className="text-rust mt-2 text-xs">{fieldError.message}</p>}
    </div>
  );
}
