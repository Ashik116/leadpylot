'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PADDING = 4;
const SYNC_DELAYS = [0, 300, 1000];

export function useIframeHeightSync(
  srcdoc: string,
  minHeight: number,
  maxHeightVh: number
) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);

  const sync = useCallback(() => {
    const iframe = ref.current;
    if (!iframe?.contentDocument?.body) return;
    try {
      const contentH = iframe.contentDocument.body.scrollHeight + PADDING;
      const maxPx = (window.innerHeight * maxHeightVh) / 100;
      setHeight((h) => {
        const next = Math.min(Math.max(minHeight, contentH), maxPx);
        return h === next ? h : next;
      });
    } catch {
      /* same-origin */
    }
  }, [minHeight, maxHeightVh]);

  useEffect(() => {
    setHeight(minHeight);
  }, [srcdoc, minHeight]);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const onLoad = () => {
      sync();
      SYNC_DELAYS.forEach((d) => timeouts.push(setTimeout(sync, d)));
    };
    iframe.addEventListener('load', onLoad);
    if (iframe.contentDocument?.readyState === 'complete') onLoad();
    return () => {
      iframe.removeEventListener('load', onLoad);
      timeouts.forEach(clearTimeout);
    };
  }, [srcdoc, sync]);

  return { ref, height };
}
