import { useEditor } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Underline } from '@tiptap/extension-underline';
import { PasteHtml } from '@/components/shared/RichTextEditor/extensions/PasteHtml';
import { UseFormSetValue } from 'react-hook-form';
import { EmailTemplateFormValues } from './useEmailTemplateForm';

export const useEmailTemplateEditor = (
  initialContent: string,
  setValue: UseFormSetValue<EmailTemplateFormValues>
) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Underline,
      PasteHtml,
    ],
    content: initialContent,
    // Avoid hydration mismatches in Next.js SSR
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setValue('template_content', editor.getHTML(), { shouldValidate: true });
    },
    onCreate: ({ editor }) => {
      const content = editor.getHTML();
      setValue('template_content', content || '<p></p>', { shouldValidate: true });
    },
  });

  // Update editor content when initialContent changes
  useEffect(() => {
    if (!editor || !initialContent) return;

    const currentHtml = editor.getHTML();
    // Only update if content is different to avoid unnecessary updates
    if (currentHtml !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  return editor;
};
