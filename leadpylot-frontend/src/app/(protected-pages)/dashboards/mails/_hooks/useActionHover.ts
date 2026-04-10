'use client';

/**
 * useActionHover Hook
 * Manages hover state for action buttons, ensuring only one shows label at a time
 */

import { useState, useCallback } from 'react';

export function useActionHover() {
  const [activeButtonId, setActiveButtonId] = useState<string | null>(null);

  const handleHoverStart = useCallback((buttonId: string) => {
    setActiveButtonId(buttonId);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setActiveButtonId(null);
  }, []);

  const isActive = useCallback((buttonId: string) => activeButtonId === buttonId, [activeButtonId]);

  return {
    activeButtonId,
    handleHoverStart,
    handleHoverEnd,
    isActive,
  };
}
