Frontend: Handling "Using Tools" During Streaming
Problem
When the leadbot runs tools (e.g. query_database, search_lead, get_crm_knowledge), the UI can show raw text like "using tools", which feels technical and unclear.

Approach: Placeholder Text Instead of Raw Tool Text
Do not append literal text like " (using tools) " to the message. Instead, show a single placeholder that changes based on SSE events.

SSE Events (from /api/conversation/stream)
Event Type	Payload	When it happens
llm_start	{ type: "llm_start" }	LLM starts generating
tool_start	{ type: "tool_start", name?: "query_database" }	A tool (e.g. DB query) starts executing
tool_done	{ type: "tool_done" }	Tool finishes
text	{ type: "text", content: "..." }	Streamed response chunk
done	{ type: "done", reply: "..." }	Final reply
message_id	{ type: "message_id", message_id, created_at }	Message ID after save
error	{ type: "error", message: "..." }	Error occurred
Implementation Pattern
Initial state
Show a placeholder like "Thinking…" in the assistant bubble.

On llm_start
Update placeholder to "Generating response…".

On tool_start
Replace placeholder with a friendly label based on data.name:

const TOOL_LABELS = {
  get_crm_knowledge: 'Looking up knowledge…',
  search_lead: 'Searching for lead…',
  query_database: 'Fetching data…',
  count_documents: 'Counting records…',
  group_and_count: 'Analyzing data…',
  get_email_templates: 'Loading email templates…',
};
const label = TOOL_LABELS[data.name] || (data.name ? `Running ${data.name}…` : 'Fetching data…');
updatePlaceholder(label);
On tool_done
Set placeholder back to "Generating response…".

On text
Clear the placeholder and append the streamed content to the bubble.

On done
Finalize the message and remove any loading state.

Important
Do not append " (using tools) " or similar raw text to the message.
The placeholder is replaced, not appended. When real text arrives, the placeholder disappears.
Tool names in tool_start include: query_database, search_lead, get_crm_knowledge, count_documents, group_and_count, get_email_templates.