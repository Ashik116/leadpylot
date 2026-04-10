/**
 * Closed-lead documents use `_id` for the archived row and `original_lead_id` for the real lead.
 * Lead detail routes and prev/next navigation must use the original lead id.
 */
export function getLeadDetailRouteId(lead: {
  _id?: string;
  original_lead_id?: string;
}): string {
  const orig = lead?.original_lead_id;
  if (orig != null && String(orig).trim() !== '') {
    return String(orig);
  }
  return lead?._id != null ? String(lead._id) : '';
}

export function mapClosedLeadsForNavigation<
  T extends { _id?: string; original_lead_id?: string },
>(items: T[]): T[] {
  return items.map((item) =>
    item?.original_lead_id != null && String(item.original_lead_id).trim() !== ''
      ? ({ ...item, _id: String(item.original_lead_id) } as T)
      : item
  );
}
