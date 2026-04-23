'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Next from '@/components/ui/Pagination/Next';
import Prev from '@/components/ui/Pagination/Prev';
import Tooltip from '@/components/ui/Tooltip';
import {
  ACTION_BAR_PAGINATION_NEXT_TOOLTIP,
  ACTION_BAR_PAGINATION_PAGE_START_TOOLTIP,
  ACTION_BAR_PAGINATION_PREV_TOOLTIP,
  ACTION_BAR_PAGINATION_RANGE_END_TOOLTIP,
  ACTION_BAR_PAGINATION_TOTAL_TOOLTIP,
  TOOLTIP_POPOVER_CLASS,
} from '@/utils/toltip.constants';

export interface PaginationBarProps {
  currentPage?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (pageNumber: number, newPageSize?: number) => void;
  showPagination?: boolean;
  showNavigation?: boolean;
}

export function PaginationBar({
  currentPage = 1,
  pageSize = 10,
  total = 0,
  onPageChange = () => {},
  showPagination = false,
  showNavigation = true,
}: PaginationBarProps) {
  const [isEditingPageNumber, setIsEditingPageNumber] = useState(false);
  const [isEditingRangeEnd, setIsEditingRangeEnd] = useState(false);
  const pageNumberSpanRef = useRef<HTMLSpanElement | null>(null);
  const rangeEndSpanRef = useRef<HTMLSpanElement | null>(null);
  const pageNumberClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rangeEndClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getStartNumber = useCallback(() => {
    return currentPage === 1 ? 1 : currentPage * pageSize - pageSize + 1;
  }, [currentPage, pageSize]);

  const getEndNumber = useCallback(() => {
    return Math.min(currentPage * pageSize, total);
  }, [currentPage, pageSize, total]);

  const getPageNumberText = useCallback(() => {
    return currentPage.toString();
  }, [currentPage]);

  const getRangeEndText = useCallback(() => {
    return getEndNumber().toString();
  }, [getEndNumber]);

  const startEditingPageNumber = useCallback(() => {
    if (!pageNumberSpanRef.current) return;
    setIsEditingPageNumber(true);
    pageNumberSpanRef.current.textContent = getPageNumberText();
  }, [getPageNumberText]);

  const handlePageNumberClick = useCallback(() => {
    if (pageNumberClickTimeoutRef.current) clearTimeout(pageNumberClickTimeoutRef.current);
    pageNumberClickTimeoutRef.current = setTimeout(startEditingPageNumber, 200);
  }, [startEditingPageNumber]);

  const handlePageNumberInput = useCallback((e: React.FormEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.textContent || '';
    if (!/^\d+$/.test(text) && text !== '') {
      e.currentTarget.textContent = text.replace(/\D/g, '');
    }
  }, []);

  const submitPageNumber = useCallback(() => {
    if (!pageNumberSpanRef.current) return;

    const text = pageNumberSpanRef.current.textContent || '';
    const newPage = parseInt(text, 10);
    const maxPage = Math.ceil(total / pageSize);

    if (isNaN(newPage) || newPage < 1 || newPage > maxPage) {
      pageNumberSpanRef.current.textContent = getPageNumberText();
      setIsEditingPageNumber(false);
      return;
    }

    onPageChange(newPage, pageSize);
    setIsEditingPageNumber(false);
  }, [getPageNumberText, total, pageSize, onPageChange]);

  const handlePageNumberKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitPageNumber();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditingPageNumber(false);
        if (pageNumberSpanRef.current) {
          pageNumberSpanRef.current.textContent = getPageNumberText();
        }
      }
    },
    [submitPageNumber, getPageNumberText]
  );

  const startEditingRangeEnd = useCallback(() => {
    if (!rangeEndSpanRef.current) return;
    setIsEditingRangeEnd(true);
    rangeEndSpanRef.current.textContent = getRangeEndText();
  }, [getRangeEndText]);

  const handleRangeEndClick = useCallback(() => {
    if (rangeEndClickTimeoutRef.current) clearTimeout(rangeEndClickTimeoutRef.current);
    rangeEndClickTimeoutRef.current = setTimeout(startEditingRangeEnd, 200);
  }, [startEditingRangeEnd]);

  const handleRangeEndDoubleClick = useCallback(() => {
    if (rangeEndClickTimeoutRef.current) {
      clearTimeout(rangeEndClickTimeoutRef.current);
      rangeEndClickTimeoutRef.current = null;
    }
    onPageChange(1, total);
  }, [onPageChange, total]);

  const handleRangeEndInput = useCallback((e: React.FormEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.textContent || '';
    if (!/^\d+$/.test(text) && text !== '') {
      e.currentTarget.textContent = text.replace(/\D/g, '');
    }
  }, []);

  const submitRangeEnd = useCallback(() => {
    if (!rangeEndSpanRef.current) return;

    const text = rangeEndSpanRef.current.textContent || '';
    const newEnd = parseInt(text, 10);
    const start = getStartNumber();

    if (isNaN(newEnd) || newEnd < 1 || newEnd > total) {
      rangeEndSpanRef.current.textContent = getRangeEndText();
      setIsEditingRangeEnd(false);
      return;
    }

    const newPageSize = newEnd - start + 1;

    if (newPageSize < 1) {
      const targetPage = Math.ceil(newEnd / pageSize);
      const maxPage = Math.ceil(total / pageSize);
      const finalPage = Math.min(Math.max(1, targetPage), maxPage);
      onPageChange(finalPage, pageSize);
      setIsEditingRangeEnd(false);
      return;
    }

    const maxPageSize = total > 0 ? total : 1000;
    const finalPageSize = Math.min(Math.max(1, newPageSize), maxPageSize);

    const maxPage = Math.ceil(total / finalPageSize);
    const targetPage = Math.min(currentPage, maxPage);

    onPageChange(targetPage, finalPageSize);
    setIsEditingRangeEnd(false);
  }, [getRangeEndText, getStartNumber, total, currentPage, pageSize, onPageChange]);

  const handleRangeEndKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitRangeEnd();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditingRangeEnd(false);
        if (rangeEndSpanRef.current) {
          rangeEndSpanRef.current.textContent = getRangeEndText();
        }
      }
    },
    [submitRangeEnd, getRangeEndText]
  );

  useEffect(() => {
    if (isEditingPageNumber && pageNumberSpanRef.current) {
      if (
        !pageNumberSpanRef.current.textContent ||
        pageNumberSpanRef.current.textContent.trim() === ''
      ) {
        pageNumberSpanRef.current.textContent = getPageNumberText();
      }

      requestAnimationFrame(() => {
        if (pageNumberSpanRef.current) {
          const range = document.createRange();
          range.selectNodeContents(pageNumberSpanRef.current);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      });
    }
  }, [isEditingPageNumber, getPageNumberText]);

  useEffect(() => {
    if (isEditingRangeEnd && rangeEndSpanRef.current) {
      if (
        !rangeEndSpanRef.current.textContent ||
        rangeEndSpanRef.current.textContent.trim() === ''
      ) {
        rangeEndSpanRef.current.textContent = getRangeEndText();
      }

      requestAnimationFrame(() => {
        if (rangeEndSpanRef.current) {
          const range = document.createRange();
          range.selectNodeContents(rangeEndSpanRef.current);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      });
    }
  }, [isEditingRangeEnd, getRangeEndText]);

  useEffect(() => {
    return () => {
      if (pageNumberClickTimeoutRef.current) clearTimeout(pageNumberClickTimeoutRef.current);
      if (rangeEndClickTimeoutRef.current) clearTimeout(rangeEndClickTimeoutRef.current);
    };
  }, []);

  if (!showPagination) return null;

  const pageCount = Math.ceil(total / pageSize);

  return (
    <div className="flex items-center">
      <Tooltip
        title={ACTION_BAR_PAGINATION_PAGE_START_TOOLTIP}
        placement="top"
        wrapperClass="inline-flex"
        className={TOOLTIP_POPOVER_CLASS}
      >
        <button
          type="button"
          className="cursor-pointer rounded px-1 text-sm whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]"
        >
          <span
            ref={pageNumberSpanRef}
            contentEditable={isEditingPageNumber}
            suppressContentEditableWarning
            onClick={handlePageNumberClick}
            onInput={handlePageNumberInput}
            onBlur={submitPageNumber}
            onKeyDown={handlePageNumberKeyDown}
            className={
              isEditingPageNumber
                ? 'inline-block w-12 max-w-min rounded bg-gray-50 px-1 transition-all duration-200 ease-in-out outline-none dark:bg-[var(--dm-bg-input)]'
                : 'transition-all duration-200 ease-in-out'
            }
          >
            {!isEditingPageNumber && getStartNumber()}
          </span>
        </button>
      </Tooltip>

      <span className="mx-0.5 text-gray-700 dark:text-[var(--dm-text-primary)]">-</span>

      <Tooltip
        title={ACTION_BAR_PAGINATION_RANGE_END_TOOLTIP}
        placement="top"
        wrapperClass="inline-flex"
        className={TOOLTIP_POPOVER_CLASS}
      >
        <button
          type="button"
          onDoubleClick={handleRangeEndDoubleClick}
          className="cursor-pointer rounded px-1 text-sm whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]"
        >
          <span
            ref={rangeEndSpanRef}
            contentEditable={isEditingRangeEnd}
            suppressContentEditableWarning
            onClick={handleRangeEndClick}
            onInput={handleRangeEndInput}
            onBlur={submitRangeEnd}
            onKeyDown={handleRangeEndKeyDown}
            className={
              isEditingRangeEnd
                ? 'inline-block w-12 max-w-min rounded bg-gray-50 px-1 transition-all duration-200 ease-in-out outline-none dark:bg-[var(--dm-bg-input)]'
                : 'transition-all duration-200 ease-in-out'
            }
          >
            {!isEditingRangeEnd && getEndNumber()}
          </span>
        </button>
      </Tooltip>

      <Tooltip
        title={ACTION_BAR_PAGINATION_TOTAL_TOOLTIP}
        placement="top"
        wrapperClass="inline-flex"
        className={TOOLTIP_POPOVER_CLASS}
      >
        <span className="ml-1 cursor-default text-sm font-semibold text-gray-700 dark:text-[var(--dm-text-primary)]">/{total}</span>
      </Tooltip>

      {showNavigation && (
        <div className="ml-2 flex items-center gap-1">
          <Tooltip
            title={ACTION_BAR_PAGINATION_PREV_TOOLTIP}
            placement="top"
            wrapperClass="inline-flex"
            className={TOOLTIP_POPOVER_CLASS}
          >
            <span className="inline-flex">
              <Prev
                currentPage={currentPage}
                pagerClass={{
                  default: 'cursor-pointer rounded-md hover:bg-gray-200 transition-colors dark:hover:bg-[var(--dm-bg-hover)]',
                  inactive: 'text-gray-700 dark:text-[var(--dm-text-primary)]',
                  active: 'bg-blue-500 text-white',
                  disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent dark:text-[var(--dm-text-muted)]',
                }}
                onPrev={() => onPageChange(currentPage - 1, pageSize)}
              />
            </span>
          </Tooltip>

          <Tooltip
            title={ACTION_BAR_PAGINATION_NEXT_TOOLTIP}
            placement="top"
            wrapperClass="inline-flex"
            className={TOOLTIP_POPOVER_CLASS}
          >
            <span className="inline-flex">
              <Next
                currentPage={currentPage}
                pageCount={pageCount}
                pagerClass={{
                  default: 'cursor-pointer rounded hover:bg-gray-300 transition-colors dark:hover:bg-[var(--dm-bg-hover)]',
                  inactive: 'text-gray-700 dark:text-[var(--dm-text-primary)]',
                  active: 'bg-blue-500 text-white',
                  disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent dark:text-[var(--dm-text-muted)]',
                }}
                onNext={() => onPageChange(currentPage + 1, pageSize)}
              />
            </span>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
