'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

/**
 * Renders children into document.body via React Portal.
 * Solves the issue where backdrop-filter on parent elements
 * breaks fixed positioning of modal overlays.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
