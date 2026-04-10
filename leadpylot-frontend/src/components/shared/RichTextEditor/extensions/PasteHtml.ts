import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const PasteHtml = Extension.create({
  name: 'pasteHtml',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('pasteHtml'),
        props: {
          handlePaste: (view, event) => {
            // First try to get HTML content (preserves styles)
            const html = event.clipboardData?.getData('text/html');
            const text = event.clipboardData?.getData('text/plain');

            // If we have HTML, use it directly (preserves inline styles)
            if (html) {
              if (event.cancelable) {
                event.preventDefault();
              }

              // Insert HTML content directly to preserve inline styles
              // Use insertContent without sanitization to preserve all attributes
              this.editor.commands.insertContent(html, {
                parseOptions: {
                  preserveWhitespace: false,
                },
              });

              return true;
            }

            // Fallback to text/plain detection for HTML source code
            if (!text) return false;

            // Remove comments and whitespace to better detect HTML
            const cleanedText = text.replace(/<!--[\s\S]*?-->/g, '').trim();
            const lowerCleaned = cleanedText.toLowerCase();

            // More robust check: looks for common HTML tags at the start
            const isHtml =
              lowerCleaned.startsWith('<!doctype html>') ||
              lowerCleaned.startsWith('<html') ||
              lowerCleaned.startsWith('<head') ||
              lowerCleaned.startsWith('<body') ||
              lowerCleaned.startsWith('<div') ||
              lowerCleaned.startsWith('<span') ||
              lowerCleaned.startsWith('<p') ||
              lowerCleaned.startsWith('<h1') ||
              lowerCleaned.startsWith('<h2') ||
              lowerCleaned.startsWith('<h3') ||
              lowerCleaned.startsWith('<h4') ||
              lowerCleaned.startsWith('<h5') ||
              lowerCleaned.startsWith('<h6') ||
              lowerCleaned.startsWith('<table') ||
              lowerCleaned.startsWith('<thead') ||
              lowerCleaned.startsWith('<tbody') ||
              lowerCleaned.startsWith('<tr') ||
              lowerCleaned.startsWith('<td') ||
              lowerCleaned.startsWith('<th') ||
              lowerCleaned.startsWith('<ul') ||
              lowerCleaned.startsWith('<ol') ||
              lowerCleaned.startsWith('<li') ||
              lowerCleaned.startsWith('<a') ||
              lowerCleaned.startsWith('<img') ||
              lowerCleaned.startsWith('<br') ||
              lowerCleaned.startsWith('<hr') ||
              lowerCleaned.startsWith('<strong') ||
              lowerCleaned.startsWith('<b') ||
              lowerCleaned.startsWith('<em') ||
              lowerCleaned.startsWith('<i') ||
              lowerCleaned.startsWith('<u') ||
              lowerCleaned.startsWith('<s') ||
              lowerCleaned.startsWith('<del') ||
              lowerCleaned.startsWith('<code') ||
              lowerCleaned.startsWith('<pre') ||
              lowerCleaned.startsWith('<blockquote') ||
              lowerCleaned.startsWith('<style') ||
              lowerCleaned.startsWith('<script') ||
              lowerCleaned.startsWith('<meta') ||
              lowerCleaned.startsWith('<link') ||
              lowerCleaned.startsWith('<iframe') ||
              lowerCleaned.startsWith('<form') ||
              lowerCleaned.startsWith('<input') ||
              lowerCleaned.startsWith('<button') ||
              lowerCleaned.startsWith('<select') ||
              lowerCleaned.startsWith('<textarea') ||
              lowerCleaned.startsWith('<label') ||
              lowerCleaned.startsWith('<section') ||
              lowerCleaned.startsWith('<article') ||
              lowerCleaned.startsWith('<header') ||
              lowerCleaned.startsWith('<footer') ||
              lowerCleaned.startsWith('<nav') ||
              lowerCleaned.startsWith('<aside') ||
              lowerCleaned.startsWith('<main') ||
              lowerCleaned.startsWith('<figure') ||
              lowerCleaned.startsWith('<figcaption') ||
              (lowerCleaned.startsWith('<') && lowerCleaned.includes('>')); // Catch-all for other tags

            if (isHtml) {
              // It looks like HTML source code
              if (event.cancelable) {
                event.preventDefault();
              }

              // We insert the content as HTML
              // Using insertContent with parseOptions to ensure full parsing
              this.editor.commands.insertContent(text, {
                parseOptions: {
                  preserveWhitespace: false,
                },
              });

              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
