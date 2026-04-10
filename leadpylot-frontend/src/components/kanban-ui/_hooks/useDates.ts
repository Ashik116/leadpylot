import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { CardDates } from '../types';
import {
  formatDateForDisplay,
  calculateDateStatus,
  getDateStatusBadge,
} from '../_data/dates-data';

interface UseDatesOptions {
  initialDates?: CardDates;
  onUpdate?: (dates?: CardDates) => void;
}

export const useDates = (options?: UseDatesOptions) => {
  const [cardDates, setCardDates] = useState<CardDates | undefined>(options?.initialDates);
  const onUpdateRef = useRef(options?.onUpdate);
  
  // Keep onUpdate ref up to date
  useEffect(() => {
    onUpdateRef.current = options?.onUpdate;
  }, [options?.onUpdate]);

  // Expose a method to sync dates from parent (called explicitly, not in effect)
  const syncDates = useCallback((dates?: CardDates) => {
    setCardDates(dates);
  }, []);

  const formattedDate = useMemo(() => {
    if (!cardDates?.dueDate) return null;
    return formatDateForDisplay(cardDates.dueDate, cardDates.dueTime);
  }, [cardDates]);

  const status = useMemo(() => {
    return calculateDateStatus(cardDates?.dueDate, cardDates?.dueTime);
  }, [cardDates]);

  const statusBadge = useMemo(() => {
    return getDateStatusBadge(status);
  }, [status]);

  // Update dates on card
  const updateCardDates = useCallback((dates?: CardDates | null) => {
    const newDates = dates === null ? undefined : dates;
    setCardDates(newDates);
    onUpdateRef.current?.(newDates);
  }, []);

  return {
    cardDates,
    formattedDate,
    status,
    statusBadge,
    hasDates: !!cardDates?.startDate || !!cardDates?.dueDate,
    updateCardDates,
    syncDates,
  };
};
