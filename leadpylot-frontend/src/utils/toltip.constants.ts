/** Default popover width/typography for app Tooltips (className on Tooltip) */
export const TOOLTIP_POPOVER_CLASS = 'max-w-sm! text-xs leading-snug';

/** Lead detail header navigation */

export const PREVIOUS_NAV_TOOLTIP =
  'Previous: go to the previous lead in your current navigation order (filtered list or queue). Disabled when there is no earlier lead.';

export const NEXT_NAV_TOOLTIP =
  'Next: go to the following lead in your current navigation order. Disabled when there is no next lead.';

export const NEXT_NAV_CURRENT_TOP_TOOLTIP =
  'Current top: jump to the lead marked as the top of your queue (your "current" item), not the next lead in sequence.';

/** Dashboard progress / stage filter (openings, netto, etc.) */

export const FILTER_BTN_DROPDOWN_TRIGGER_TOOLTIP =
  'Open this menu to switch which pipeline stage you are viewing (All, Contract, Confirmation, Payment, Netto, Lost).';

export const FILTER_BTN_ALL_TOOLTIP =
  'All: show openings from every stage together in one list (no stage filter).';

export const FILTER_BTN_CONTRACT_TOOLTIP =
  'Contract: show only openings at the contract stage (before confirmation and payment).';

export const FILTER_BTN_CONFIRMATION_TOOLTIP =
  'Confirmation: show openings waiting for or in customer confirmation.';

export const FILTER_BTN_PAYMENT_TOOLTIP =
  'Payment: show openings in the payment stage.';

export const FILTER_BTN_NETTO1_TOOLTIP =
  'Netto 1: show openings in the first netto (payout) step.';

export const FILTER_BTN_NETTO2_TOOLTIP =
  'Netto 2: show openings in the second netto (payout) step.';

export const FILTER_BTN_LOST_TOOLTIP =
  'Lost: show openings that were marked as lost / not proceeding.';

/** Common dashboard action bar (search, filters dropdown, stage/agent/date, columns, pagination) */

export const ACTION_BAR_LIST_SEARCH_TOOLTIP =
  'Search this list: click to expand, then type to filter rows (search applies after a short pause).';

export const ACTION_BAR_FILTERS_GROUPING_TOOLTIP =
  'Open filters and grouping: import filters, group-by, and dynamic column filters for this table.';

export const ACTION_BAR_STAGE_GROUP_BY_TOOLTIP =
  'Stage: group the table by current pipeline stage. Click again to clear stage grouping.';

export const ACTION_BAR_AGENT_FILTER_TOOLTIP =
  'Agent: filter rows by one or more agents. Choose from the searchable list.';

export const ACTION_BAR_DATE_FILTER_TOOLTIP =
  'Date: filter by a preset range or a custom from–to range on the date field used for this page.';

export const ACTION_BAR_COLUMNS_TOOLTIP =
  'Columns: show, hide, and reorder which columns appear in this table.';

export const ACTION_BAR_PAGINATION_PAGE_START_TOOLTIP =
  'Range start / page: click, type a page number, press Enter to jump to that page.';

export const ACTION_BAR_PAGINATION_RANGE_END_TOOLTIP =
  'Visible row count: single-click to edit how many rows to show on this page (confirm with Enter). Double-click to show all rows.';

export const ACTION_BAR_PAGINATION_TOTAL_TOOLTIP =
  'Total rows matching the current filters and search.';

export const ACTION_BAR_PAGINATION_PREV_TOOLTIP = 'Go to the previous page.';

export const ACTION_BAR_PAGINATION_NEXT_TOOLTIP = 'Go to the next page.';

/** Filters dropdown — open custom filter builder */

export const FILTERS_PANEL_ADD_CUSTOM_FILTER_TOOLTIP =
  'Add custom filter: build rules by field, operator, and value for this table.';

/** Custom filter builder (dynamic filters panel) */

export const CUSTOM_FILTER_BACK_TOOLTIP =
  'Back: return to the Filters list without losing rules until you leave or clear them.';

export const CUSTOM_FILTER_REMOVE_RULE_TOOLTIP =
  'Remove this filter rule from the list (at least one rule must stay).';

export const CUSTOM_FILTER_ADD_RULE_TOOLTIP =
  'Add another filter rule (up to 20 rules).';

export const CUSTOM_FILTER_CLEAR_RULES_TOOLTIP =
  'Clear all rules and reset to default filters for this page.';

export const CUSTOM_FILTER_SAVED_VIEWS_TOOLTIP =
  'Saved views: open filter presets saved for this page and load one into the editor.';

export const CUSTOM_FILTER_SAVE_BUTTON_TOOLTIP =
  'Save the current rules as a named preset on your account.';

export const CUSTOM_FILTER_APPLY_BUTTON_TOOLTIP =
  'Apply filters: run the table with these rules and close when used from the filters panel.';

/** Group by — saved grouping presets (header toolbar) */

export const GROUP_BY_SAVED_VIEWS_TOOLTIP =
  'Saved views: open grouping presets saved for this page.';

export const GROUP_BY_SAVE_BUTTON_TOOLTIP =
  'Save the current Group By fields as a preset you can load later.';
