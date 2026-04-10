'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary - catches errors in route segments.
 * Shows a friendly message when server is down or chunks fail to load.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Failed to load chunk') ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Loading CSS chunk');

  const isServerDown =
    isChunkError ||
    error?.message?.includes('500') ||
    error?.message?.includes('Internal Server Error') ||
    error?.message?.includes('ERR_ABORTED');

  const title = isServerDown
    ? 'Service temporarily unavailable'
    : 'Something went wrong';

  const description = isServerDown
    ? 'Our servers may be experiencing issues or your connection was interrupted. Please try again in a moment.'
    : 'An unexpected error occurred. Please try again.';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sunbeam-2 text-3xl"
          aria-hidden
        >
          ⚠
        </div>
        <h2 className="text-xl font-semibold text-sand-1">{title}</h2>
        <p className="mt-3 text-base leading-relaxed text-sand-2">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="button ring-sand-1 hover:border-sand-1 hover:text-sand-1 button-press-feedback inline-flex h-12 items-center justify-center rounded-lg border border-sand-1 bg-sand-1 px-6 text-base font-medium text-sand-5 hover:ring-1"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="button ring-sand-1 hover:border-sand-1 hover:text-sand-1 button-press-feedback inline-flex h-12 items-center justify-center rounded-lg border border-border bg-white px-6 text-base font-medium text-sand-2 hover:ring-1"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
