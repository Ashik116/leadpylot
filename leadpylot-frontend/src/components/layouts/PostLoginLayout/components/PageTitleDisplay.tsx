import React from 'react';
import { PageInfo } from '../hooks/usePageTitle';

export interface PageTitleDisplayProps {
  pageInfo?: PageInfo;
  shouldHideHeaderTitle: boolean;
  shouldHideHeaderSubtitle: boolean;
}

/**
 * Page Title Display Component
 * Shows page title and subtitle with loading states
 */
export const PageTitleDisplay = React.memo<PageTitleDisplayProps>(
  ({ pageInfo, shouldHideHeaderTitle, shouldHideHeaderSubtitle }) => {
    if (shouldHideHeaderTitle) {
      return null;
    }

    if (pageInfo?.title) {
      return (
        <div className="ml-1 flex flex-col md:ml-4">
          <h1 className="text-sm font-semibold text-nowrap text-gray-900 md:text-lg xl:text-2xl">
            {pageInfo.title}
          </h1>
          <div className="h-5">
            {pageInfo?.subtitle && (
              <p className="text-xs text-nowrap text-gray-600 md:text-sm">{pageInfo?.subtitle}</p>
            )}
          </div>
        </div>
      );
    }

    // Loading skeleton
    return (
      <div className="ml-4 flex flex-col">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-200 md:h-6 md:w-56 xl:h-7 xl:w-72" />
        {!shouldHideHeaderSubtitle && (
          <div className="mt-1 h-3 w-28 animate-pulse rounded bg-gray-100 md:h-4 md:w-40" />
        )}
      </div>
    );
  }
);

PageTitleDisplay.displayName = 'PageTitleDisplay';
