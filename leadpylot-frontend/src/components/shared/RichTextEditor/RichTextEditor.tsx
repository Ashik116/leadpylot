'use client';
import classNames from '@/utils/classNames';
import ToolButtonBold from './toolButtons/ToolButtonBold';
import ToolButtonItalic from './toolButtons/ToolButtonItalic';
import ToolButtonStrike from './toolButtons/ToolButtonStrike';
import ToolButtonCode from './toolButtons/ToolButtonCode';
import ToolButtonOrderedList from './toolButtons/ToolButtonOrderedList';
import ToolButtonCodeBlock from './toolButtons/ToolButtonCodeBlock';
import ToolButtonBlockquote from './toolButtons/ToolButtonBlockquote';
import ToolButtonHorizontalRule from './toolButtons/ToolButtonHorizontalRule';
import ToolButtonHeading from './toolButtons/ToolButtonHeading';
import ToolButtonParagraph from './toolButtons/ToolButtonParagraph';
import ToolButtonUndo from './toolButtons/ToolButtonUndo';
import ToolButtonRedo from './toolButtons/ToolButtonRedo';
import ToolButtonBulletList from './toolButtons/ToolButtonBulletList';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { PasteHtml } from '@/components/shared/RichTextEditor/extensions/PasteHtml';
import { AllowInlineStyles } from '@/components/shared/RichTextEditor/extensions/AllowInlineStyles';
import type { Editor, EditorContentProps, JSONContent } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import type { ReactNode, JSX, Ref } from 'react';
import type { BaseToolButtonProps, HeadingLevel } from './toolButtons/types';

export type RichTextEditorRef = HTMLDivElement;

type RichTextEditorProps = {
  content?: string;
  placeholder?: string;
  invalid?: boolean;
  customToolBar?: (
    editor: Editor,
    components: {
      ToolButtonBold: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonItalic: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonStrike: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonCode: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonBlockquote: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonHeading: ({
        editor,
      }: BaseToolButtonProps & {
        headingLevel?: HeadingLevel[];
      }) => JSX.Element;
      ToolButtonBulletList: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonOrderedList: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonCodeBlock: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonHorizontalRule: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonParagraph: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonUndo: ({ editor }: BaseToolButtonProps) => JSX.Element;
      ToolButtonRedo: ({ editor }: BaseToolButtonProps) => JSX.Element;
    }
  ) => ReactNode;
  onChange?: (content: { text: string; html: string; json: JSONContent }) => void;
  editorContentClass?: string;
  customEditor?: Editor | null;
  ref?: Ref<RichTextEditorRef>;
} & Omit<EditorContentProps, 'editor' | 'ref' | 'onChange'>;

// Helper function to add borders to tables in HTML (for email compatibility)
const addBordersToTables = (html: string): string => {
  if (!html || html.trim() === '') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Helper to merge styles properly
  const mergeStyles = (element: Element, newStyles: string): void => {
    const existingStyle = element.getAttribute('style') || '';
    const existingProps = existingStyle.split(';').filter((s) => s.trim());
    const newProps = newStyles.split(';').filter((s) => s.trim());

    // Create a map of existing style properties
    const styleMap = new Map<string, string>();
    existingProps.forEach((prop) => {
      const [key, value] = prop.split(':').map((s) => s.trim());
      if (key) styleMap.set(key.toLowerCase(), `${key}: ${value}`);
    });

    // Add new properties only if they don't exist
    newProps.forEach((prop) => {
      const [key, value] = prop.split(':').map((s) => s.trim());
      if (key && !styleMap.has(key.toLowerCase())) {
        styleMap.set(key.toLowerCase(), `${key}: ${value}`);
      }
    });

    // Reconstruct style string
    const mergedStyle = Array.from(styleMap.values()).join('; ');
    element.setAttribute('style', mergedStyle);
  };

  // Add borders to table elements
  const tables = doc.querySelectorAll('table');
  tables.forEach((table) => {
    mergeStyles(table, 'border-collapse: collapse; border: 1px solid black');
  });

  // Add borders to th elements
  const headers = doc.querySelectorAll('th');
  headers.forEach((th) => {
    mergeStyles(th, 'border: 1px solid black; padding: 4px 8px');
  });

  // Add borders to td elements
  const cells = doc.querySelectorAll('td');
  cells.forEach((td) => {
    mergeStyles(td, 'border: 1px solid black; padding: 4px 8px');
  });

  return doc.body.innerHTML;
};

const RichTextEditor = (props: RichTextEditorProps) => {
  const {
    content = '',
    placeholder,
    customToolBar,
    invalid,
    onChange,
    editorContentClass,
    customEditor,
    ref,
    ...rest
  } = props;

  // Track the last content we notified about to prevent loops
  const lastNotifiedContent = useRef<string>('');

  const defaultEditor = useEditor({
    extensions: [
      // AllowInlineStyles must come before StarterKit to override its extensions
      AllowInlineStyles,
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          HTMLAttributes: {
            class: 'tiptap-bullet-list',
          },
        },
        orderedList: {
          keepMarks: true,
          HTMLAttributes: {
            class: 'tiptap-ordered-list',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'tiptap-list-item',
          },
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write something...',
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Table.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute('style'),
              renderHTML: (attributes) => {
                // Default email-safe border styles for tables
                const defaultStyles = 'border-collapse: collapse; border: 1px solid black;';

                if (!attributes.style) {
                  return {
                    style: defaultStyles,
                  };
                }

                // Merge default styles with existing ones
                // Existing styles take precedence
                return {
                  style: `${defaultStyles} ${attributes.style}`,
                };
              },
            },
          };
        },
      }).configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute('style'),
              renderHTML: (attributes) => {
                if (!attributes.style) {
                  return {};
                }
                return {
                  style: attributes.style,
                };
              },
            },
          };
        },
      }).configure({
        HTMLAttributes: {
          class: 'tiptap-table-row',
        },
      }),
      TableHeader.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute('style'),
              renderHTML: (attributes) => {
                // Default email-safe border styles for table headers
                const defaultStyles = 'border: 1px solid black; padding: 4px 8px;';

                if (!attributes.style) {
                  return {
                    style: defaultStyles,
                  };
                }

                // Merge default styles with existing ones
                // Existing styles take precedence
                return {
                  style: `${defaultStyles} ${attributes.style}`,
                };
              },
            },
            height: {
              default: null,
              parseHTML: (element) => element.getAttribute('height'),
              renderHTML: (attributes) => {
                if (!attributes.height) {
                  return {};
                }
                return {
                  height: attributes.height,
                };
              },
            },
            width: {
              default: null,
              parseHTML: (element) => element.getAttribute('width'),
              renderHTML: (attributes) => {
                if (!attributes.width) {
                  return {};
                }
                return {
                  width: attributes.width,
                };
              },
            },
          };
        },
      }).configure({
        HTMLAttributes: {
          class: 'tiptap-table-header',
        },
      }),
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute('style'),
              renderHTML: (attributes) => {
                // Default email-safe border styles for table cells
                const defaultStyles = 'border: 1px solid black; padding: 4px 8px;';

                if (!attributes.style) {
                  return {
                    style: defaultStyles,
                  };
                }

                // Merge default styles with existing ones
                // Existing styles take precedence
                return {
                  style: `${defaultStyles} ${attributes.style}`,
                };
              },
            },
            height: {
              default: null,
              parseHTML: (element) => element.getAttribute('height'),
              renderHTML: (attributes) => {
                if (!attributes.height) {
                  return {};
                }
                return {
                  height: attributes.height,
                };
              },
            },
            width: {
              default: null,
              parseHTML: (element) => element.getAttribute('width'),
              renderHTML: (attributes) => {
                if (!attributes.width) {
                  return {};
                }
                return {
                  width: attributes.width,
                };
              },
            },
          };
        },
      }).configure({
        HTMLAttributes: {
          class: 'tiptap-table-cell',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Underline,
      PasteHtml,
      AllowInlineStyles,
    ],
    editorProps: {
      attributes: {
        class: 'm-2 focus:outline-hidden',
      },
      transformPastedHTML(html) {
        // Add border styles to pasted tables to ensure they persist in emails
        return addBordersToTables(html);
      },
      transformPastedText(text) {
        // Allow pasted text to be processed normally
        return text;
      },
    },
    parseOptions: {
      // Ensure style attributes are preserved during parsing
      preserveWhitespace: false,
    },
    content,
    // Avoid hydration mismatches in Next.js SSR
    immediatelyRender: false,
    onUpdate({ editor }) {
      const rawHtml = editor.getHTML();
      // Ensure borders are added to all tables in the output HTML
      const htmlWithBorders = addBordersToTables(rawHtml);

      lastNotifiedContent.current = htmlWithBorders;
      onChange?.({
        text: editor.getText(),
        html: htmlWithBorders,
        json: editor.getJSON(),
      });
    },
  });

  const editor = customEditor ?? defaultEditor;

  // this effect used for reset Html text inside Filed. Keep editor content in sync with `content` prop so parent can reset/replace it
  useEffect(() => {
    if (!editor) return;
    // keep in sync with external content without breaking hook order
    const incoming = content ?? '';

    // When parent clears content, ensure editor is empty
    if (incoming === '') {
      if (!editor.isEmpty) {
        editor.commands.clearContent(true);
      }
      return;
    }

    // For non-empty, only update when different to avoid loops
    const currentHtml = editor.getHTML();
    if (currentHtml !== incoming) {
      // Add borders to tables before setting content
      const contentWithBorders = addBordersToTables(incoming);

      // setContent will preserve inline styles because of our AllowInlineStyles extension
      // emitUpdate: false prevents onUpdate/onChange from firing during sync - this stops
      // infinite loops when parent displays API preview (e.g. templates with attachments/signatures)
      editor.commands.setContent(contentWithBorders, { emitUpdate: false });

      // Manually trigger onChange only when borders were added to tables - and only if
      // we haven't already notified this content (avoids loops with preview/attachment content)
      if (
        onChange &&
        contentWithBorders !== incoming &&
        contentWithBorders !== lastNotifiedContent.current
      ) {
        lastNotifiedContent.current = contentWithBorders;
        onChange({
          text: editor.getText(),
          html: contentWithBorders,
          json: editor.getJSON(),
        });
      }
    }
  }, [content, editor, onChange]);

  if (!editor) return null;

  return (
    <div
      className={classNames(
        'border-border ring-border focus:outline-border rounded-lg border ring-1',
        editor.isFocused && 'ring-sand-3 border-sand-3',
        editor.isFocused && invalid && 'ring-rust border-rust'
      )}
    >
      <div className="bg-sand-4 flex flex-wrap gap-x-1 gap-y-2 rounded-t-lg px-2">
        {customToolBar ? (
          customToolBar(editor, {
            ToolButtonBold,
            ToolButtonItalic,
            ToolButtonStrike,
            ToolButtonCode,
            ToolButtonBlockquote,
            ToolButtonHeading,
            ToolButtonBulletList,
            ToolButtonOrderedList,
            ToolButtonCodeBlock,
            ToolButtonHorizontalRule,
            ToolButtonParagraph,
            ToolButtonUndo,
            ToolButtonRedo,
          })
        ) : (
          <>
            <ToolButtonBold editor={editor} />
            <ToolButtonItalic editor={editor} />
            <ToolButtonStrike editor={editor} />
            <ToolButtonCode editor={editor} />
            <ToolButtonBlockquote editor={editor} />
            <ToolButtonHeading editor={editor} />
            <ToolButtonBulletList editor={editor} />
            <ToolButtonOrderedList editor={editor} />
            <ToolButtonCodeBlock editor={editor} />
            <ToolButtonHorizontalRule editor={editor} />
          </>
        )}
      </div>

      <EditorContent
        ref={ref}
        className={classNames(
          'max-h-[450px] max-w-full cursor-text overflow-auto px-2',
          editorContentClass
        )}
        editor={editor}
        onClick={() => editor?.commands.focus()}
        {...rest}
      />
    </div>
  );
};

export default RichTextEditor;
