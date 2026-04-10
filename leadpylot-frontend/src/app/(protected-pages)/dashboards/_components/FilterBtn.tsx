import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import { useSearchBarExpandedStore } from '@/stores/searchBarExpandedStore';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { DashboardType, TDashboardType } from './dashboardTypes';
import { useUnifiedDashboardContext } from './unified-dashboard/UnifiedDashboardContext';
import { useEffect, useRef, useState } from 'react';
import {
  FILTER_BTN_ALL_TOOLTIP,
  FILTER_BTN_CONFIRMATION_TOOLTIP,
  FILTER_BTN_CONTRACT_TOOLTIP,
  FILTER_BTN_DROPDOWN_TRIGGER_TOOLTIP,
  FILTER_BTN_LOST_TOOLTIP,
  FILTER_BTN_NETTO1_TOOLTIP,
  FILTER_BTN_NETTO2_TOOLTIP,
  FILTER_BTN_PAYMENT_TOOLTIP,
  TOOLTIP_POPOVER_CLASS,
} from '@/utils/toltip.constants';

type ProgressFilterItem = {
  value: TDashboardType;
  label: string;
  icon: string;
  activeClass: string;
  inactiveClass: string;
  tooltip: string;
};

/** Below this: always dropdown. At 893–xl: dropdown when isExpanded. Above xl: never dropdown. */
const ALWAYS_DROPDOWN_MAX_WIDTH = 893;
/** Tailwind xl breakpoint */
const XL_BREAKPOINT = 1280;
/** Show arrow between button and dropdown only up to this width (matches FiltersDropdown). */
const ARROW_MAX_WIDTH = 1650;

const FilterBtn = () => {
  const context = useUnifiedDashboardContext();

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isExpanded = useSearchBarExpandedStore((s) => s.isExpanded);

  // Below 893: always dropdown; 893 to xl: dropdown only when isExpanded; above xl: never dropdown
  const useDropdown =
    windowWidth < ALWAYS_DROPDOWN_MAX_WIDTH
      ? true
      : windowWidth < XL_BREAKPOINT
        ? isExpanded
        : false;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!useDropdown && isDropdownOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDropdownOpen(false);
    }
  }, [useDropdown, isDropdownOpen]);

  if (!context) return null;

  const {
    config,
    selectedProgressFilter,
    handleProgressFilterChange,
    dashboardType,
    selectedItems,
    sessionRole,
  } = context;

  const isEligibleRole = sessionRole === Role.ADMIN || sessionRole === Role.AGENT;
  if (!config.showProgressFilter || selectedItems?.length > 0 || !isEligibleRole) {
    return <></>;
  }

  const stripTriangleIndicator = (className: string) =>
    className.replace('filter-triangle-indicator', '').replace(/\s+/g, ' ').trim();

  const getDropdownItemClass = (className: string) =>
    `${stripTriangleIndicator(className)} w-full justify-start rounded-none px-3 py-2 text-sm text-left`;

  const handleFilterClick = (filter: TDashboardType) => {
    handleProgressFilterChange(filter);
  };

  const openingFilterItems: ProgressFilterItem[] = [
    {
      value: 'all' as TDashboardType,
      label: 'All',
      icon: 'menu',
      tooltip: FILTER_BTN_ALL_TOOLTIP,
      activeClass:
        'filter-triangle-indicator relative flex items-center justify-center gap-2 bg-sky-500 text-white hover:bg-sky-600 hover:text-white',
      inactiveClass:
        'relative flex items-center justify-center gap-2 bg-sky-500 text-white hover:bg-sky-600 hover:text-white',
    },
    {
      value: DashboardType?.OPENING,
      label: 'Contract',
      icon: 'send-inclined',
      tooltip: FILTER_BTN_CONTRACT_TOOLTIP,
      activeClass:
        'hover:bg-btn-opening filter-triangle-indicator relative flex items-center justify-center gap-2 bg-btn-opening text-black hover:text-black',
      inactiveClass:
        'bg-btn-opening hover:bg-btn-opening relative flex items-center justify-center gap-2 hover:text-black',
    },
    {
      value: DashboardType?.CONFIRMATION,
      label: 'Confirmation',
      icon: 'check-circle',
      tooltip: FILTER_BTN_CONFIRMATION_TOOLTIP,
      activeClass:
        'hover:bg-btn-confirmation filter-triangle-indicator relative flex items-center justify-center gap-2 bg-btn-confirmation text-black hover:text-black',
      inactiveClass:
        'bg-btn-confirmation hover:bg-btn-confirmation relative flex items-center justify-center gap-2 hover:text-black',
    },
    {
      value: DashboardType?.PAYMENT,
      label: 'Payment',
      icon: 'money-bag',
      tooltip: FILTER_BTN_PAYMENT_TOOLTIP,
      activeClass:
        'hover:bg-btn-payment filter-triangle-indicator relative flex items-center justify-center gap-2 bg-btn-payment text-black hover:text-black',
      inactiveClass:
        'bg-btn-payment hover:bg-btn-payment relative flex items-center justify-center gap-2 hover:text-black',
    },
    {
      value: 'netto1' as TDashboardType,
      label: 'Netto 1',
      icon: 'cog',
      tooltip: FILTER_BTN_NETTO1_TOOLTIP,
      activeClass:
        'hover:bg-btn-netto1 filter-triangle-indicator relative flex items-center justify-center gap-2 bg-btn-netto1 text-black hover:text-black',
      inactiveClass:
        'bg-btn-netto1 hover:bg-btn-netto1 relative flex items-center justify-center gap-2 hover:text-black',
    },
    {
      value: 'netto2' as TDashboardType,
      label: 'Netto 2',
      icon: 'cog',
      tooltip: FILTER_BTN_NETTO2_TOOLTIP,
      activeClass:
        'hover:bg-btn-netto2 filter-triangle-indicator relative flex items-center justify-center gap-2 bg-btn-netto2 text-black hover:text-black',
      inactiveClass:
        'bg-btn-netto2 hover:bg-btn-netto2 relative flex items-center justify-center gap-2 hover:text-black',
    },
    {
      value: DashboardType?.LOST,
      label: 'Lost',
      icon: 'times-circle',
      tooltip: FILTER_BTN_LOST_TOOLTIP,
      activeClass:
        'hover:bg-btn-lost filter-triangle-indicator relative flex items-center justify-center gap-2 bg-btn-lost text-white hover:text-white',
      inactiveClass:
        'bg-btn-lost hover:bg-btn-lost relative flex items-center justify-center gap-2 text-white hover:text-white',
    },
  ];

  const nettoFilterItems: ProgressFilterItem[] = [
    {
      value: 'netto1' as TDashboardType,
      label: 'Netto 1',
      icon: 'cog',
      tooltip: FILTER_BTN_NETTO1_TOOLTIP,
      activeClass:
        'hover:bg-btn-netto1 filter-triangle-indicator relative flex items-center justify-center gap-2 bg-btn-netto1 text-black hover:text-black',
      inactiveClass:
        'bg-btn-netto1 hover:bg-btn-netto1 relative flex items-center justify-center gap-2 hover:text-black',
    },
    {
      value: 'netto2' as TDashboardType,
      label: 'Netto 2',
      icon: 'cog',
      tooltip: FILTER_BTN_NETTO2_TOOLTIP,
      activeClass:
        'hover:bg-btn-netto2 filter-triangle-indicator relative flex items-center justify-center gap-2 bg-btn-netto2 text-black hover:text-black',
      inactiveClass:
        'bg-btn-netto2 hover:bg-btn-netto2 relative flex items-center justify-center gap-2 hover:text-black',
    },
  ];

  const renderCompactDropdown = (items: ProgressFilterItem[]) => {
    const currentItem = items.find((item) => item.value === selectedProgressFilter) || items[0];
    const currentClass = currentItem
      ? stripTriangleIndicator(
        currentItem.value === selectedProgressFilter
          ? currentItem.activeClass
          : currentItem.inactiveClass
      )
      : '';

    const showArrow = isDropdownOpen && windowWidth <= ARROW_MAX_WIDTH;

    return (
      <div className="relative dashboard-filter-btn-container" ref={dropdownRef}>
        <Tooltip
          title={FILTER_BTN_DROPDOWN_TRIGGER_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            size="xs"
            className={`${currentClass} pr-2`}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            <span className="flex items-center gap-2">
              <ApolloIcon name={currentItem.icon as any} />
              <span>{currentItem.label}</span>
              <ApolloIcon name="chevron-arrow-down" className="text-xs" />
            </span>
          </Button>
        </Tooltip>
        {/* Arrow between button and dropdown; only up to ARROW_MAX_WIDTH */}
        {showArrow && (
          <div
            className="absolute top-full left-1/2 z-40 -translate-x-1/2"
            style={{ marginTop: '2px' }}
          >
            <div className="h-0 w-0 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-white border-l-transparent" />
            <div className="-mt-[6px] h-0 w-0 border-r-[7px] border-b-[7px] border-l-[7px] border-r-transparent border-b-black border-l-transparent" />
          </div>
        )}
        <div
          className={`absolute top-full left-0 z-40 min-w-[200px] origin-top transform rounded-md border border-gray-200 bg-white shadow-lg transition-all duration-200 ease-in-out ${showArrow ? 'mt-1' : 'mt-2'} ${isDropdownOpen
            ? 'translate-y-0 scale-y-100 opacity-100'
            : 'pointer-events-none -translate-y-2 scale-y-95 opacity-0'
            }`}
        >
          <div className="py-1">
            {items.map((item) => {
              const isActive = item.value === selectedProgressFilter;
              const itemClass = getDropdownItemClass(
                isActive ? item.activeClass : item.inactiveClass
              );
              return (
                <Tooltip
                  key={item.value}
                  title={item.tooltip}
                  placement="right"
                  wrapperClass="inline-flex w-full"
                  className={TOOLTIP_POPOVER_CLASS}
                >
                  <button
                    type="button"
                    className={itemClass}
                    onClick={() => {
                      handleFilterClick(item.value);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <ApolloIcon name={item.icon as any} className="text-sm" />
                    <span>{item.label}</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Show Netto filters only for netto dashboard
  if (dashboardType === 'netto') {
    if (useDropdown) {
      return renderCompactDropdown(nettoFilterItems);
    }
    return (
      <div className="flex items-center gap-2 dashboard-filter-btn-container">
        <Tooltip
          title={FILTER_BTN_NETTO1_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            icon={<ApolloIcon name="cog" />}
            onClick={() => handleFilterClick('netto1' as TDashboardType)}
            size="xs"
            className={
              selectedProgressFilter === 'netto1'
                ? 'hover:bg-btn-netto1 filter-triangle-indicator bg-btn-netto1 relative flex items-center justify-center gap-2 text-black hover:text-black'
                : 'bg-btn-netto1 hover:bg-btn-netto1 relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            <span>Netto 1</span>
          </Button>
        </Tooltip>
        <Tooltip
          title={FILTER_BTN_NETTO2_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            icon={<ApolloIcon name="cog" />}
            size="xs"
            onClick={() => handleFilterClick('netto2' as TDashboardType)}
            className={
              selectedProgressFilter === 'netto2'
                ? 'hover:bg-btn-netto2 filter-triangle-indicator bg-btn-netto2 relative flex items-center justify-center gap-2 text-black hover:text-black'
                : 'bg-btn-netto2 hover:bg-btn-netto2 relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            <span>Netto 2</span>
          </Button>
        </Tooltip>
      </div>
    );
  }

  // Original filters for other dashboard types (Openings)
  if (dashboardType === DashboardType?.OPENING) {
    if (useDropdown) {
      return renderCompactDropdown(openingFilterItems);
    }

    // Always show full row if not dropdown
    return (
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap dashboard-filter-btn-container">
        <Tooltip
          title={FILTER_BTN_ALL_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            icon={<ApolloIcon name="menu" />}
            size="xs"
            onClick={() => handleFilterClick('all' as TDashboardType)}
            className={
              selectedProgressFilter === 'all'
                ? 'filter-triangle-indicator relative flex items-center justify-center gap-2 bg-sky-500 text-white hover:bg-sky-600 hover:text-white'
                : 'relative flex items-center justify-center gap-2 bg-sky-500 text-white hover:bg-sky-600 hover:text-white'
            }
          >
            <span>All</span>
          </Button>
        </Tooltip>
        <Tooltip
          title={FILTER_BTN_CONTRACT_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            icon={<ApolloIcon name="send-inclined" />}
            onClick={() => handleFilterClick(DashboardType?.OPENING)}
            size="xs"
            className={
              selectedProgressFilter === DashboardType?.OPENING
                ? 'hover:bg-btn-opening filter-triangle-indicator bg-btn-opening relative flex items-center justify-center gap-2 text-black hover:text-black'
                : 'bg-btn-opening hover:bg-btn-opening relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            <span>Contract</span>
          </Button>
        </Tooltip>
        <Tooltip
          title={FILTER_BTN_CONFIRMATION_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            icon={<ApolloIcon name="check-circle" />}
            onClick={() => handleFilterClick(DashboardType?.CONFIRMATION)}
            size="xs"
            className={
              selectedProgressFilter === DashboardType?.CONFIRMATION
                ? 'hover:bg-btn-confirmation filter-triangle-indicator bg-btn-confirmation relative flex items-center justify-center gap-2 text-black hover:text-black'
                : 'bg-btn-confirmation hover:bg-btn-confirmation relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            <span>Confirmation</span>
          </Button>
        </Tooltip>
        <Tooltip
          title={FILTER_BTN_PAYMENT_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            icon={<ApolloIcon name="money-bag" />}
            size="xs"
            onClick={() => handleFilterClick(DashboardType?.PAYMENT)}
            className={
              selectedProgressFilter === DashboardType?.PAYMENT
                ? 'hover:bg-btn-payment filter-triangle-indicator bg-btn-payment relative flex items-center justify-center gap-2 text-black hover:text-black'
                : 'bg-btn-payment hover:bg-btn-payment relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            <span>Payment</span>
          </Button>
        </Tooltip>
        <Tooltip
          title={FILTER_BTN_NETTO1_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            icon={<ApolloIcon name="cog" />}
            size="xs"
            onClick={() => handleFilterClick('netto1' as TDashboardType)}
            className={
              selectedProgressFilter === 'netto1'
                ? 'hover:bg-btn-netto1 filter-triangle-indicator bg-btn-netto1 relative flex items-center justify-center gap-2 text-black hover:text-black'
                : 'bg-btn-netto1 hover:bg-btn-netto1 relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            <span>Netto 1</span>
          </Button>
        </Tooltip>
        <Tooltip
          title={FILTER_BTN_NETTO2_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            icon={<ApolloIcon name="cog" />}
            size="xs"
            onClick={() => handleFilterClick('netto2' as TDashboardType)}
            className={
              selectedProgressFilter === 'netto2'
                ? 'hover:bg-btn-netto2 filter-triangle-indicator bg-btn-netto2 relative flex items-center justify-center gap-2 text-black hover:text-black'
                : 'bg-btn-netto2 hover:bg-btn-netto2 relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            <span>Netto 2</span>
          </Button>
        </Tooltip>
        <Tooltip
          title={FILTER_BTN_LOST_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
        >
          <Button
            icon={<ApolloIcon name="times-circle" />}
            size="xs"
            onClick={() => handleFilterClick(DashboardType?.LOST)}
            className={
              selectedProgressFilter === DashboardType?.LOST
                ? 'hover:bg-btn-lost filter-triangle-indicator bg-btn-lost relative flex items-center justify-center gap-2 text-white hover:text-white'
                : 'bg-btn-lost hover:bg-btn-lost relative flex items-center justify-center gap-2 text-white hover:text-white'
            }
          >
            <span>Lost</span>
          </Button>
        </Tooltip>
      </div>
    );
  }

  // Default return for other dashboard types
  return null;
};

export default FilterBtn;
