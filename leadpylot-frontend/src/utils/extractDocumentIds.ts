import { DOCUMENT_TYPES } from '@/components/shared/DocumentTypeOptions';

/**
 * Column ID to slot/file-type mapping for bulk document download.
 * Used to extract document IDs from selected rows based on which column was clicked.
 */
/** Human-readable labels for each column (for confirmation popup) */
export const BULK_DOWNLOAD_COLUMN_LABELS: Record<string, string> = {
  email: 'Email',
  offer: 'Offer',
  contract_id: 'Contract',
  id_confirmation: 'ID',
  annah_id: 'Annahme',
  swift_id: 'Swift',
  netto1_email_all: 'N1 Mail',
  netto2_email_all: 'N2 Mail',
  offer_contract_all: 'Offer',
  opening_contract_all: 'Contract',
  opening_id_all: 'ID',
  confirmation_contract_all: 'Annahme',
  payment_contract_all: 'Swift',
};

export const BULK_DOWNLOAD_COLUMN_MAP: Record<
  string,
  { slot?: string; fileType?: string }
> = {
  email: { slot: 'offer_email' },
  offer: { slot: 'offer_contract', fileType: DOCUMENT_TYPES.OFFER_CONTRACT },
  contract_id: { slot: 'contract' },
  id_confirmation: { slot: 'id_files' },
  annah_id: { slot: 'annahme' },
  swift_id: { slot: 'swift' },
  netto1_email_all: { fileType: DOCUMENT_TYPES.NETTO1_EMAIL },
  netto2_email_all: { fileType: DOCUMENT_TYPES.NETTO2_EMAIL },
  // "all" variants for unified dashboard (OPENING, PAYMENT, etc.)
  offer_contract_all: { slot: 'offer_contract', fileType: DOCUMENT_TYPES.OFFER_CONTRACT },
  opening_contract_all: { slot: 'contract' },
  opening_id_all: { slot: 'id_files' },
  id_files_all: { slot: 'id_files' },
  confirmation_contract_all: { slot: 'annahme' },
  annahme_all: { slot: 'annahme' },
  payment_contract_all: { slot: 'swift' },
  swift_all: { slot: 'swift' },
};

/**
 * Get the underlying offer/opening data from a selected item.
 * Handles both flat rows and grouped rows (originalData, offer_id).
 */
function getOfferData(item: any): any {
  if (!item) return null;
  return item?.originalData ?? item?.offer_id ?? item;
}

/**
 * Extract document IDs from a slot (document_slots.<slot>).
 */
function extractFromSlot(offer: any, slotName: string): string[] {
  const slot = offer?.document_slots?.[slotName];
  if (!slot) return [];

  const ids: string[] = [];

  // documents[]._id
  const docs = slot.documents ?? [];
  docs.forEach((d: any) => {
    const id = d?._id ?? d?.id;
    if (id) ids.push(String(id));
  });

  // emails[].attachments[].document_id
  const emails = slot.emails ?? [];
  emails.forEach((e: any) => {
    const attachments = e?.attachments ?? [];
    attachments.forEach((a: any) => {
      const docId = a?.document_id ?? a?.documentId ?? a?._id;
      if (docId) ids.push(String(docId));
    });
  });

  return ids;
}

/**
 * Extract document IDs from files[] where type matches.
 * files[]._id is the document/attachment ID used for download.
 */
function extractFromFiles(offer: any, fileType: string): string[] {
  const files = offer?.files ?? [];
  return files
    .filter((f: any) => f?.type === fileType && f?._id)
    .map((f: any) => String(f._id));
}

/**
 * Extract document IDs from progression stage files (openings).
 */
function extractFromProgression(offer: any, stage: string): string[] {
  const stageData = offer?.progression?.[stage];
  const files = stageData?.files ?? [];
  return files
    .filter((f: any) => f?.document)
    .map((f: any) => String(f.document));
}

/**
 * Extract all document IDs for a given column from selected items.
 * Deduplicates and filters out empty strings.
 *
 * @param items - Selected row items (can be flat or grouped)
 * @param columnId - Column ID (e.g. 'email', 'offer', 'contract_id', 'netto1_email_all')
 * @returns Array of document IDs to pass to bulk-download API
 */
export function extractDocumentIdsFromItems(
  items: any[],
  columnId: string
): string[] {
  const config = BULK_DOWNLOAD_COLUMN_MAP[columnId];
  if (!config || !items?.length) return [];

  const allIds: string[] = [];

  for (const item of items) {
    const offer = getOfferData(item);
    if (!offer) continue;

    if (config.slot) {
      allIds.push(...extractFromSlot(offer, config.slot));
    }

    if (config.fileType) {
      allIds.push(...extractFromFiles(offer, config.fileType));
    }

    // For OFFER column: document_slots.offer_contract (offers) + files[] type offer-contract (openings)
    if (columnId === 'offer' || columnId === 'offer_contract_all') {
      allIds.push(...extractFromSlot(offer, 'offer_contract'));
    }

    // Contract column: ONLY document_slots.contract (multiple docs possible)
    // Offer column on openings: ONLY files[] type offer-contract - do NOT use progression.opening (mixed types)
    if (config.fileType === DOCUMENT_TYPES.NETTO1_EMAIL) {
      allIds.push(...extractFromProgression(offer, 'netto1'));
    }
    if (config.fileType === DOCUMENT_TYPES.NETTO2_EMAIL) {
      allIds.push(...extractFromProgression(offer, 'netto2'));
    }
  }

  return [...new Set(allIds.filter(Boolean))];
}
