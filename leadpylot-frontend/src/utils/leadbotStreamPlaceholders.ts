/**
 * Friendly UI labels for Leadbot SSE stream phases (see STREAM_CHAT / tool definitions).
 * Do not append raw status strings into the assistant message body — use placeholders only.
 */

export const LEADBOT_THINKING_PLACEHOLDER = 'Thinking…';

export const LEADBOT_GENERATING_PLACEHOLDER = 'Generating response…';

const TOOL_LABELS: Record<string, string> = {
  get_crm_knowledge: 'Looking up knowledge…',
  search_lead: 'Searching for lead…',
  query_database: 'Fetching data…',
  count_documents: 'Counting records…',
  group_and_count: 'Analyzing data…',
  count_unique: 'Analyzing data…',
  get_email_templates: 'Loading email templates…',
  get_offers: 'Loading offers…',
  get_project_banks: 'Loading bank data…',
};

/** Maps tool_start `name` to a short status line for the assistant bubble. */
export function leadbotToolPlaceholder(name: string | undefined): string {
  if (name && TOOL_LABELS[name]) return TOOL_LABELS[name];
  if (name) return `Running ${name}…`;
  return 'Fetching data…';
}
