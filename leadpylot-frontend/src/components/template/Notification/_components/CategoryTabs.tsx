'use client';

import React, { useMemo } from 'react';
import { NotificationCategory, CATEGORY_LABELS } from '@/configs/notification.config';
import HorizontalScrollableMenu, {
  ScrollableMenuItem,
} from '@/components/shared/HorizontalScrollableMenu';

export interface CategoryTabsProps {
  /** Currently selected category (null = all) */
  selectedCategory: NotificationCategory | null;
  /** Callback when category changes */
  onCategoryChange: (category: NotificationCategory | null) => void;
  /** List of categories to display */
  categories: NotificationCategory[];
  /** Render function for external scroll controls */
  renderScrollControls?: (props: {
    canScrollLeft: boolean;
    canScrollRight: boolean;
    onScrollLeft: (e: React.MouseEvent) => void;
    onScrollRight: (e: React.MouseEvent) => void;
  }) => React.ReactNode;
  /** Whether to show scroll icons on hover (default: false when using external controls) */
  showScrollIcons?: boolean;
}

/** Tab-style classes: continuous strip with underline for active, no button backgrounds.
 *  All tabs use same border-b-2 so layout doesn't shift when switching (no UI blinding). */
const TAB_ITEM_CLASS =
  '!rounded-none !px-2.5 !pt-2 !pb-1.5 text-gray-500 hover:text-gray-700 border-b-2 border-transparent';
const TAB_ACTIVE_CLASS =
  '!rounded-none !bg-transparent !ring-0 !px-2.5 !pt-2 !pb-1.5 text-green-600 font-semibold border-b-2 border-green-600';

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedCategory,
  onCategoryChange,
  categories,
  renderScrollControls,
  showScrollIcons = false,
}) => {
  // Convert categories to ScrollableMenuItem format
  const menuItems: ScrollableMenuItem[] = useMemo(() => {
    const items: ScrollableMenuItem[] = [
      {
        id: 'all',
        label: 'All Categories',
        isActive: selectedCategory === null,
        onClick: () => onCategoryChange(null),
      },
    ];

    categories?.forEach((category: NotificationCategory) => {
      const label = CATEGORY_LABELS[category] || category;
      items.push({
        id: category,
        label,
        isActive: selectedCategory === category,
        onClick: () => onCategoryChange(category),
      });
    });

    return items;
  }, [categories, selectedCategory, onCategoryChange]);

  return (
    <HorizontalScrollableMenu
      items={menuItems}
      scrollStep={200}
      showScrollIcons={showScrollIcons}
      scrollControlsMode="always"
      renderScrollControls={renderScrollControls}
      itemClassName={TAB_ITEM_CLASS}
      activeItemClassName={TAB_ACTIVE_CLASS}
    />
  );
};

export default CategoryTabs;
