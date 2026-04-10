'use client';

/** Attachment can be document ID string or full doc object with _id and optional public_url (from API) */
export type AttachmentInput = string | { _id?: string; public_url?: string } | null | undefined;

/**
 * Returns display URL for an attachment.
 * Uses public_url from API when available (no /view call).
 * Returns null when public_url is not present (no fallback to /view).
 */
export function useAttachmentDisplayUrl(attachment: AttachmentInput): string | null {
  const doc = typeof attachment === 'object' && attachment ? attachment : null;
  return doc?.public_url ?? null;
}
