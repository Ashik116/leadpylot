/**
 * Normalizes offers array to leads format for navigation store.
 * Extracts lead_id from each offer and sets _id for consistent matching.
 */

interface OfferWithLeadId {
  lead_id?: { _id?: string };
  leadId?: string;
  _id?: string;
  [key: string]: unknown;
}

export function normalizeOffersToLeads<T extends OfferWithLeadId>(
  offers: T[],
  options?: { includeLeadId?: boolean }
): Array<T & { _id: string; leadId?: string }> {
  const { includeLeadId = false } = options ?? {};
  return offers
    .map((offer) => {
      const leadId = offer?.lead_id?._id || offer?.leadId;
      const id = String(leadId || offer?._id || '');
      const mapped = {
        ...offer,
        _id: id,
        ...(includeLeadId && { leadId }),
      };
      return mapped as T & { _id: string; leadId?: string };
    })
    .filter((item) => Boolean(item._id));
}
