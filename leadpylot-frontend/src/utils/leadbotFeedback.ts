import type { LeadbotConversationMessage, LeadbotMessageFeedbackMetadata } from '@/types/leadbot.types';

/** Read `metadata.feedback` from API messages for thumbs state. */
export function parseLeadbotMessageFeedback(
  metadata: LeadbotConversationMessage['metadata']
): LeadbotMessageFeedbackMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const fb = (metadata as Record<string, unknown>).feedback;
  if (!fb || typeof fb !== 'object') return null;
  const r = (fb as Record<string, unknown>).rating;
  if (r !== 1 && r !== -1) return null;
  const correction = (fb as Record<string, unknown>).correction;
  return {
    rating: r,
    ...(typeof correction === 'string' && correction.trim() ? { correction: correction.trim() } : {}),
  };
}
