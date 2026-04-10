import { Extension } from '@tiptap/core';

/**
 * Extension to preserve inline styles on all elements
 * This ensures that style attributes from pasted HTML are preserved
 * by adding a global attribute handler that allows style on all nodes
 */
export const AllowInlineStyles = Extension.create({
  name: 'allowInlineStyles',

  addGlobalAttributes() {
    return [
      {
        // Apply to block and container node types - text nodes cannot have attributes
        // For text styling, use marks (bold, italic, color, etc.) instead
        types: [
          'paragraph',
          'heading',
          'bulletList',
          'orderedList',
          'listItem',
          'blockquote',
          'codeBlock',
          'horizontalRule',
          'table',
          'tableRow',
          'tableCell',
          'tableHeader',
          'hardBreak',
        ],
        attributes: {
          style: {
            default: null,
            // Parse style attribute from HTML
            parseHTML: (element) => {
              const style = element.getAttribute('style');
              return style || null;
            },
            // Render style attribute to HTML
            renderHTML: (attributes) => {
              if (!attributes.style) {
                return {};
              }
              // Return style attribute as-is - this preserves inline styles
              return {
                style: attributes.style,
              };
            },
          },
        },
      },
    ];
  },
});
