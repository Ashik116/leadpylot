/**
 * Catches ChunkLoadError and 500 asset errors as unhandled promise rejections.
 * Shows a user-friendly overlay when the server is down or chunks fail to load.
 * Runs before React - must use vanilla JS only.
 */
(function () {
  function isChunkOrServerError(reason) {
    if (!reason) return false;
    var msg = (reason.message || reason.toString || String(reason)).toLowerCase();
    var name = (reason.name || '').toLowerCase();
    return (
      name === 'chunkloaderror' ||
      msg.indexOf('failed to load chunk') !== -1 ||
      msg.indexOf('loading chunk') !== -1 ||
      msg.indexOf('loading css chunk') !== -1 ||
      msg.indexOf('err_aborted') !== -1 ||
      msg.indexOf('500') !== -1 ||
      msg.indexOf('internal server error') !== -1
    );
  }

  function showErrorOverlay() {
    if (document.getElementById('chunk-error-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'chunk-error-overlay';
    overlay.setAttribute(
      'style',
      'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f2f0;font-family:system-ui,sans-serif'
    );
    overlay.innerHTML =
      '<div style="max-width:480px;text-align:center;background:#fff;border-radius:12px;padding:48px 32px;box-shadow:0 4px 24px rgba(45,40,39,0.08)">' +
      '<div style="width:64px;height:64px;margin:0 auto 24px;border-radius:50%;background:#ffdf61;display:flex;align-items:center;justify-content:center;font-size:32px">⚠</div>' +
      '<h1 style="font-size:1.5rem;font-weight:600;margin:0 0 12px;color:#2d2827">Service temporarily unavailable</h1>' +
      '<p style="font-size:1rem;line-height:1.6;color:#78746e;margin:0 0 32px">Our servers may be experiencing issues or your connection was interrupted. Please try again in a moment.</p>' +
      '<button type="button" id="chunk-error-retry" style="padding:12px 24px;font-size:1rem;font-weight:500;color:#fff;background:#2d2827;border:none;border-radius:8px;cursor:pointer">Try again</button>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById('chunk-error-retry').onclick = function () {
      window.location.reload();
    };
  }

  window.addEventListener('unhandledrejection', function (event) {
    if (isChunkOrServerError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
      showErrorOverlay();
    }
  });
})();
