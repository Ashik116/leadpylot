import { FilterRule } from '@/stores/filterChainStore';
import { Role } from '@/configs/navigation.config/auth.route.config';
import type { DomainFilter } from '@/stores/universalGroupingFilterStore';

// Define page types for better type safety
export type PageType =
  | 'pending-leads'
  | 'active-leads'
  | 'useable-leads'
  | 'todo'
  | 'live-leads'
  | 'recycle-leads'
  | 'archived'
  | 'leads'
  | 'leads-bank'
  | 'offers'
  | 'out-offers'
  | 'openings'
  | 'confirmations'
  | 'payments'
  | 'netto'
  | 'holds'
  | 'termin';

// Define filter configuration interface
export interface FilterConfig {
  pageType: PageType;
  pathPatterns: string[];
  defaultFilters: FilterRule[];
  roleBasedFilters?: {
    [Role.AGENT]?: FilterRule[];
    [Role.ADMIN]?: FilterRule[];
    [Role.PROVIDER]?: FilterRule[];
  };
  defaultGroupBy?: {
    [Role.AGENT]?: string[];
    [Role.ADMIN]?: string[];
    [Role.PROVIDER]?: string[];
  };
  defaultCustomFilters?: {
    [Role.AGENT]?: DomainFilter[];
    [Role.ADMIN]?: DomainFilter[];
    [Role.PROVIDER]?: DomainFilter[];
  };
}

// Common filter patterns to avoid duplication
const COMMON_FILTERS = {
  // Agent status exclusions - used in multiple places
  AGENT_STATUS_EXCLUSIONS: [
    'Payment',
    'Opening',
    'Confirmation',
    'Angebot',
    'Netto1',
    'Netto2',
    'Contract',
  ].map((status) => ({
    field: 'status',
    operator: '!=' as const,
    value: status,
  })),

  // Common default group by for agent role
  AGENT_STATUS_GROUP_BY: ['status_id'] as string[],

  // Common filters
  STATUS_NOT_EQUALS_HOLD: {
    field: 'status',
    operator: '!=' as const,
    value: 'Hold',
  },
  STATUS_EQUALS_HOLD: {
    field: 'status',
    operator: '=' as const,
    value: 'Hold',
  },
  NOT_PENDING: {
    field: 'use_status',
    operator: '!=' as const,
    value: 'pending',
  },

  PENDING: {
    field: 'use_status',
    operator: '=' as const,
    value: 'pending',
  },

  ACTIVE_FALSE: {
    field: 'active',
    operator: '=' as const,
    value: false,
  },
} as const;

// Centralized filter configurations
export const FILTER_CONFIGS: FilterConfig[] = [
  {
    pageType: 'pending-leads',
    pathPatterns: ['pending-leads'],
    defaultFilters: [COMMON_FILTERS.PENDING, COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD],
  },
  {
    pageType: 'active-leads',
    pathPatterns: ['active-leads'],
    defaultFilters: [
      {
        field: 'use_status',
        operator: '=' as const,
        value: 'active',
      },
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
  },
  {
    pageType: 'useable-leads',
    pathPatterns: ['useable-leads'],
    defaultFilters: [
      {
        field: 'use_status',
        operator: '=' as const,
        value: 'usable',
      },
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
  },
  {
    pageType: 'todo',
    pathPatterns: ['todo'],
    defaultFilters: [
      {
        field: 'has_todo',
        operator: '=',
        value: true,
      },
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
    defaultGroupBy: {
      [Role.AGENT]: COMMON_FILTERS.AGENT_STATUS_GROUP_BY,
    },
  },
  {
    pageType: 'live-leads',
    pathPatterns: ['live-leads'],
    defaultFilters: [
      {
        field: 'source',
        operator: '=',
        value: 'live',
      },
      COMMON_FILTERS.NOT_PENDING,
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
    roleBasedFilters: {
      [Role.AGENT]: COMMON_FILTERS.AGENT_STATUS_EXCLUSIONS,
    },
    defaultGroupBy: {
      [Role.AGENT]: COMMON_FILTERS.AGENT_STATUS_GROUP_BY,
    },
    defaultCustomFilters: {
      [Role.AGENT]: [
        [
          'status_id',
          'in',
          ['New', 'Angebot', 'Termin', 'NE1', 'NE2', 'NE3', 'NE4'],
        ] as DomainFilter,
      ],
    },
  },
  {
    pageType: 'recycle-leads',
    pathPatterns: ['recycle-leads'],
    defaultFilters: [
      {
        field: 'source',
        operator: '=',
        value: 'recycle',
      },
      COMMON_FILTERS.NOT_PENDING,
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
    roleBasedFilters: {
      [Role.AGENT]: COMMON_FILTERS.AGENT_STATUS_EXCLUSIONS,
    },
    defaultGroupBy: {
      [Role.AGENT]: COMMON_FILTERS.AGENT_STATUS_GROUP_BY,
    },
    defaultCustomFilters: {
      [Role.AGENT]: [
        [
          'status_id',
          'in',
          ['New', 'Angebot', 'Termin', 'NE1', 'NE2', 'NE3', 'NE4'],
        ] as DomainFilter,
      ],
    },
  },
  {
    pageType: 'archived',
    pathPatterns: ['archived'],
    defaultFilters: [COMMON_FILTERS.ACTIVE_FALSE, COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD],
    defaultGroupBy: {
      [Role.AGENT]: COMMON_FILTERS.AGENT_STATUS_GROUP_BY,
    },
  },
  {
    pageType: 'leads-bank',
    pathPatterns: ['leads-bank'],
    defaultFilters: [COMMON_FILTERS.NOT_PENDING, COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD],
    defaultGroupBy: {
      [Role.AGENT]: COMMON_FILTERS.AGENT_STATUS_GROUP_BY,
    },
  },
  {
    pageType: 'leads',
    pathPatterns: ['/leads'],
    defaultFilters: [], // No default filters for leads-bank page
  },
  {
    pageType: 'offers',
    pathPatterns: ['offers'],
    defaultFilters: [
      {
        field: 'has_offer',
        operator: '=',
        value: true,
      },
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
    // No default grouping for agents on offers page
  },
  {
    pageType: 'out-offers',
    pathPatterns: ['out-offers'],
    defaultFilters: [
      {
        field: 'out',
        operator: '=',
        value: true,
      },
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
  },
  {
    pageType: 'openings',
    pathPatterns: ['openings'],
    defaultFilters: [
      {
        field: 'has_opening',
        operator: '=',
        value: true,
      },
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
    // No default grouping for agents on openings page
  },
  {
    pageType: 'confirmations',
    pathPatterns: ['confirmation'],
    defaultFilters: [
      {
        field: 'has_confirmation',
        operator: '=',
        value: true,
      },
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
    defaultGroupBy: {
      [Role.AGENT]: ['lead_id.status_id'],
    },
  },
  {
    pageType: 'payments',
    pathPatterns: ['payment'],
    defaultFilters: [
      {
        field: 'has_payment',
        operator: '=',
        value: true,
      },
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
    defaultGroupBy: {
      [Role.AGENT]: ['lead_id.status_id'],
    },
  },
  {
    pageType: 'netto',
    pathPatterns: ['netto'],
    defaultFilters: [
      {
        field: 'has_netto',
        operator: '=',
        value: true,
      },
      COMMON_FILTERS.STATUS_NOT_EQUALS_HOLD,
    ],
    defaultGroupBy: {
      [Role.AGENT]: ['lead_id.status_id'],
    },
  },
  {
    pageType: 'holds',
    pathPatterns: ['holds'],
    defaultFilters: [COMMON_FILTERS.STATUS_EQUALS_HOLD],
  },
  {
    pageType: 'termin',
    pathPatterns: ['termin'],
    defaultFilters: [COMMON_FILTERS.STATUS_EQUALS_HOLD],
    // DISABLED: Default groupBy for termin page - removed as per requirement
    // defaultGroupBy: {
    //   [Role.AGENT]: ['lead_id.status_id'],
    // },
  },
];

// Create a lookup map for faster page type detection
const PATH_TO_PAGE_TYPE_MAP = new Map<string, PageType>();
FILTER_CONFIGS.forEach((config) => {
  config.pathPatterns.forEach((pattern) => {
    PATH_TO_PAGE_TYPE_MAP.set(pattern, config.pageType);
  });
});

// Create a lookup map for faster filter config retrieval
const PAGE_TYPE_TO_CONFIG_MAP = new Map<PageType, FilterConfig>();
FILTER_CONFIGS.forEach((config) => {
  PAGE_TYPE_TO_CONFIG_MAP.set(config.pageType, config);
});

// Optimized helper function to detect page type from pathname
// Check more specific patterns (longer) first to avoid false matches
export const detectPageType = (pathname: string): PageType | null => {
  // Convert Map to array and sort by pattern length (descending) to check more specific patterns first
  const sortedPatterns = Array.from(PATH_TO_PAGE_TYPE_MAP.entries()).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [pattern, pageType] of sortedPatterns) {
    if (pathname.includes(pattern)) {
      return pageType;
    }
  }
  return null;
};

// Optimized helper function to get filter configuration for a page
export const getFilterConfig = (pageType: PageType): FilterConfig | null => {
  return PAGE_TYPE_TO_CONFIG_MAP.get(pageType) || null;
};

// Optimized helper function to get all filters for a page and role
export const getPageFilters = (
  pathname: string,
  userRole?: string,
  pendingLeadsComponent: boolean = false
): {
  defaultFilters: FilterRule[];
  roleBasedFilters: FilterRule[];
  defaultGroupBy: string[];
} => {
  // Handle pending leads component override
  if (pendingLeadsComponent) {
    const pendingConfig = PAGE_TYPE_TO_CONFIG_MAP.get('pending-leads');
    return {
      defaultFilters: pendingConfig?.defaultFilters || [],
      roleBasedFilters: pendingConfig?.roleBasedFilters?.[userRole as Role] || [],
      defaultGroupBy: pendingConfig?.defaultGroupBy?.[userRole as Role] || [],
    };
  }

  const pageType = detectPageType(pathname);
  if (!pageType) {
    return {
      defaultFilters: [],
      roleBasedFilters: [],
      defaultGroupBy: [],
    };
  }

  const config = PAGE_TYPE_TO_CONFIG_MAP.get(pageType);
  if (!config) {
    return {
      defaultFilters: [],
      roleBasedFilters: [],
      defaultGroupBy: [],
    };
  }

  return {
    defaultFilters: config.defaultFilters || [],
    roleBasedFilters:
      (config.roleBasedFilters && userRole ? config.roleBasedFilters[userRole as Role] : []) || [],
    defaultGroupBy:
      (config.defaultGroupBy && userRole ? config.defaultGroupBy[userRole as Role] : []) || [],
  };
};

// Optimized helper function to build complete filter array
export const buildCompleteFilters = (
  pathname: string,
  userRole?: string,
  pendingLeadsComponent: boolean = false
): FilterRule[] => {
  const { defaultFilters, roleBasedFilters } = getPageFilters(
    pathname,
    userRole,
    pendingLeadsComponent
  );

  return [...defaultFilters, ...roleBasedFilters];
};

// Optimized helper function to get default group by for a page and role
export const getDefaultGroupBy = (
  pathname: string,
  userRole?: string,
  pendingLeadsComponent: boolean = false
): string[] => {
  const { defaultGroupBy } = getPageFilters(pathname, userRole, pendingLeadsComponent);
  return defaultGroupBy;
};

// Optimized helper function to get default custom filters for a page and role
export const getDefaultCustomFilters = (
  pathname: string,
  userRole?: string,
  pendingLeadsComponent: boolean = false
): DomainFilter[] => {
  // Handle pending leads component override
  if (pendingLeadsComponent) {
    const pendingConfig = PAGE_TYPE_TO_CONFIG_MAP.get('pending-leads');
    return pendingConfig?.defaultCustomFilters?.[userRole as Role] || [];
  }

  const pageType = detectPageType(pathname);
  if (!pageType) {
    return [];
  }

  const config = PAGE_TYPE_TO_CONFIG_MAP.get(pageType);
  if (!config) {
    return [];
  }

  return (config.defaultCustomFilters && userRole ? config.defaultCustomFilters[userRole as Role] : []) || [];
};

// Export constants for commonly used values (now using the centralized definition)
export const ROLE_BASED_STATUS_FILTERS = {
  [Role.AGENT]: COMMON_FILTERS.AGENT_STATUS_EXCLUSIONS,
};
