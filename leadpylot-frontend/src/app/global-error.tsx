'use client';

/**
 * Global error boundary - catches root-level crashes including:
 * - ChunkLoadError (failed to load JS/CSS chunks - server down, 500, network)
 * - 500 Internal Server Errors when loading static assets
 * - Other uncaught React errors
 *
 * Must include its own <html> and <body> since it replaces the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#f4f2f0',
            color: '#2d2827',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              textAlign: 'center',
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '48px 32px',
              boxShadow: '0 4px 24px rgba(45, 40, 39, 0.08)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                backgroundColor: '#ffdf61',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
              }}
              aria-hidden
            >
              ⚠
            </div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                margin: '0 0 12px',
                color: '#2d2827',
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.6,
                color: '#78746e',
                margin: '0 0 32px',
              }}
            >
              {description}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: '#fff',
                  backgroundColor: '#2d2827',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: '#2d2827',
                  backgroundColor: 'transparent',
                  border: '1px solid #d8d6d4',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
