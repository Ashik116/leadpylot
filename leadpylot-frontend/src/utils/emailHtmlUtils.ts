const TABLE_STYLE =
  'border-collapse: collapse; width: 100%; margin-bottom: 1em; margin-top: 1em;';
const TABLE_BORDER_STYLE = 'border: 1px solid #e5e7eb;';
const CELL_STYLE =
  'border: 1px solid #e5e7eb; padding: 0.35em; vertical-align: middle; min-width: 2em;';

/**
 * Adds inline border/padding styles to data-table elements so that table
 * formatting is preserved in email clients (which strip external CSS).
 *
 * A table is treated as a "data table" (needs borders) when:
 *  - it has a `border` attribute with a value > 0, OR
 *  - it has any `<th>` children (header row implies a data table)
 *
 * Layout tables (no border attribute, or border="0") are left untouched.
 */
export function inlineTableStyles(html: string): string {
  if (!html || typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('table').forEach((table) => {
    const isDataTable =
      isExplicitBorderTable(table) || table.querySelector('th') !== null;

    mergeInlineStyle(table, TABLE_STYLE);

    if (isDataTable) {
      mergeInlineStyle(table, TABLE_BORDER_STYLE);

      table.querySelectorAll('td, th').forEach((cell) => {
        mergeInlineStyle(cell, CELL_STYLE);
      });
    }
  });

  return doc.body.innerHTML;
}

function isExplicitBorderTable(table: HTMLTableElement): boolean {
  const attr = table.getAttribute('border');
  if (attr !== null && attr !== '0' && attr !== '') return true;

  const style = table.getAttribute('style') ?? '';
  return /border\s*:/i.test(style);
}

function mergeInlineStyle(el: Element, defaults: string) {
  const existing = el.getAttribute('style') ?? '';
  const existingProps = new Set(
    existing
      .split(';')
      .map((s) => s.split(':')[0]?.trim().toLowerCase())
      .filter(Boolean)
  );

  const additions = defaults
    .split(';')
    .filter((s) => {
      const prop = s.split(':')[0]?.trim().toLowerCase();
      return prop && !existingProps.has(prop);
    })
    .join(';');

  if (!additions) return;

  const merged = existing ? `${existing.replace(/;?\s*$/, '')}; ${additions}` : additions;
  el.setAttribute('style', merged);
}
