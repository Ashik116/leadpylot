'use client';

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dialog from '@/components/ui/Dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import Loading from '../Loading';

interface BulkSearchResultsHeaderProps {
  foundCount: number;
  searchedIds: string[]; // Can contain partner IDs, emails, or phone numbers
  onClearSearch: () => void;
  onEditSearch: () => void; // New prop for edit functionality
  isLoading: boolean;
}

const GAP_PX = 6;
const MORE_BUTTON_WIDTH_PX = 80;
const FALLBACK_DISPLAY_LIMIT = 10;

const BulkSearchResultsHeader = ({
  foundCount,
  searchedIds,
  onClearSearch,
  onEditSearch,
  isLoading,
}: BulkSearchResultsHeaderProps) => {
  const [isAllValuesDialogOpen, setIsAllValuesDialogOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tagWidth, setTagWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureTagRef = useRef<HTMLSpanElement>(null);

  // Measure tags container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width: w } = entries[0]?.contentRect ?? {};
      if (typeof w === 'number') setContainerWidth(w);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Measure a sample tag width (first value, same styles as rendered tags)
  useEffect(() => {
    const el = measureTagRef.current;
    if (!el || !searchedIds?.length) return;
    const ro = new ResizeObserver((entries) => {
      const { width: w } = entries[0]?.contentRect ?? {};
      if (typeof w === 'number' && w > 0) setTagWidth(w);
    });
    ro.observe(el);
    const w = el.getBoundingClientRect().width;
    if (w > 0) setTagWidth(w);
    return () => ro.disconnect();
  }, [searchedIds?.length, searchedIds?.[0]]);

  const displayLimit = useMemo(() => {
    const total = searchedIds?.length ?? 0;
    if (total === 0) return 0;
    if (containerWidth <= 0 || tagWidth <= 0) return Math.min(FALLBACK_DISPLAY_LIMIT, total);
    const perTag = tagWidth + GAP_PX;
    // First check if all fit without reserving space for "+N More"
    const countNoReserve = Math.floor(containerWidth / perTag);
    if (countNoReserve >= total) return total;
    // Reserve space for "+N More" button and recalculate
    const available = containerWidth - MORE_BUTTON_WIDTH_PX - GAP_PX;
    if (available <= 0) return 1;
    const count = Math.floor(available / perTag);
    return Math.max(1, Math.min(count, total));
  }, [containerWidth, tagWidth, searchedIds?.length]);

  const hasMoreIds = (searchedIds?.length ?? 0) > displayLimit;
  const displayedIds = searchedIds?.slice(0, displayLimit) ?? [];
  const moreCount = (searchedIds?.length ?? 0) - displayLimit;
  if (isLoading) {
    return <Loading loading={isLoading} />;
  }
  const tagClassName =
    'inline-flex max-w-[140px] truncate rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xxs font-medium text-gray-700 min-[480px]:max-w-[200px] min-[480px]:px-2 min-[480px]:py-0.5 min-[480px]:text-xs min-[1240px]:max-w-full';

  return (
    <>
      <div className="flex min-w-0 flex-col gap-1 min-[1240px]:flex-row min-[1240px]:items-start min-[1240px]:justify-between min-[1240px]:gap-2">
        <div className="min-w-0 flex-1 overflow-hidden">
          {/* Title + Actions row on small screens */}
          <div className="flex flex-wrap items-center justify-between gap-1 min-[1240px]:contents">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 min-[1240px]:flex-initial">
              <h1 className="text-sm font-semibold text-gray-900 min-[1240px]:text-nowrap">
                Bulk Search Results
              </h1>
              <span className="inline-flex shrink-0 items-center rounded bg-blue-100 px-1.5 py-0.5 text-xxs font-medium text-blue-800 min-[480px]:text-xs">
                {foundCount} found
              </span>
            </div>
            {/* Action buttons - small screens only */}
            <div className="flex shrink-0 items-center gap-0.5 min-[1240px]:hidden">
              <Button
                variant="secondary"
                size="sm"
                onClick={onEditSearch}
                icon={<ApolloIcon name="pen" className="text-xs leading-0" />}
                className="shrink-0 rounded px-1 text-xs"
              ></Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onClearSearch}
                icon={<ApolloIcon name="cross" className="text-xs leading-0" />}
                className="shrink-0 rounded px-1 text-xs"
              ></Button>
            </div>
          </div>
          {/* Searched Values */}
          <div className="mt-0.5 flex min-w-0 flex-col gap-1 min-[1240px]:mt-1 min-[1240px]:flex-row min-[1240px]:items-center min-[1240px]:gap-2">
            <h3 className="shrink-0 text-xxs font-medium text-gray-500 min-[1240px]:text-xs">
              Searched Values ({searchedIds?.length})
            </h3>
            <div
              ref={containerRef}
              className="relative flex min-w-0 flex-wrap items-center gap-1 min-[1240px]:gap-1.5"
            >
              {/* Off-screen tag for width measurement - must match tag styles */}
              {searchedIds?.[0] != null && (
                <span ref={measureTagRef} aria-hidden className={`pointer-events-none absolute left-[-9999px] top-0 ${tagClassName}`}>
                  {searchedIds[0]}
                </span>
              )}
              {displayedIds?.map((id, index) => (
                <span key={index} className={tagClassName} title={String(id)}>
                  {id}
                </span>
              ))}
              {hasMoreIds && (
                <Button
                  variant="plain"
                  size="xs"
                  onClick={() => setIsAllValuesDialogOpen(true)}
                  className="inline-flex shrink-0 items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xxs font-medium text-blue-700 hover:bg-blue-100 min-[480px]:text-xs"
                >
                  +{moreCount} More
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - desktop only (1240px+) */}
        <div className="hidden shrink-0 items-center gap-1 min-[1240px]:flex">
            <Button
              variant="secondary"
              size="sm"
              onClick={onEditSearch}
              icon={<ApolloIcon name="pen" className="text-sm leading-0" />}
              className="bg-sunbeam-2 hover:bg-sunbeam-3 text-sand-1 shrink-0 rounded px-1 text-sm"
            ></Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearSearch}
              icon={<ApolloIcon name="cross" className="text-sm leading-0" />}
              className="shrink-0 rounded px-1 text-sm"
            ></Button>
          </div>
        </div>

      <Dialog
        isOpen={isAllValuesDialogOpen}
        onClose={() => setIsAllValuesDialogOpen(false)}
        onRequestClose={() => setIsAllValuesDialogOpen(false)}
        width={640}
        contentClassName="p-4"
      >
        <h3 className="mb-2 text-sm font-medium text-gray-900">
          Searched Values ({searchedIds?.length ?? 0})
        </h3>
        <div className="max-h-[60vh] overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {searchedIds?.map((id, index) => (
              <span
                key={index}
                className="inline-flex max-w-full truncate rounded border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700"
                title={String(id)}
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default BulkSearchResultsHeader;
