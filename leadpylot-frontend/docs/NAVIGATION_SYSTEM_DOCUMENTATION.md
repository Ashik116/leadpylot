# LeadPylot Frontend Navigation System Documentation

## Overview

The LeadPylot frontend implements a sophisticated navigation system that enables seamless navigation between leads dashboard and individual lead details pages while maintaining context across different filter modes, search states, and grouped data views. This system is built on multiple Zustand stores and React Query for state management and data fetching.

## Architecture Components

### 1. Core Navigation Stores

#### 1.1 Generic Navigation Store (`src/stores/genericNavigationStore.ts`)

- **Purpose**: Base navigation functionality for any entity type
- **Key Features**:
  - Current index tracking
  - Item management (add, update, remove)
  - Navigation methods (previous/next)
  - Total items count
- **Interface**: `NavigationState<T extends { _id: string }>`

#### 1.2 Filter-Aware Navigation Store (`src/stores/navigationStores.ts`)

- **Purpose**: Advanced navigation that respects current filter states
- **Key Features**:
  - Filter state tracking
  - Filtered items management
  - Context-aware navigation
  - Support for multiple filter modes
- **Interface**: `FilterAwareNavigationState<T extends { _id: string }>`

#### 1.3 API URL Store (`src/stores/apiUrlStore.ts`)

- **Purpose**: Persists API URLs for navigation context
- **Features**:
  - LocalStorage persistence
  - Route-based cleanup
  - Support for grouped leads API URLs

#### 1.4 Default API Store (`src/stores/defaultApiStore.ts`)

- **Purpose**: Stores default API parameters for navigation
- **Features**:
  - Persists API call parameters
  - Used for fallback navigation data
  - LocalStorage persistence

### 2. Navigation Modes

The system supports multiple navigation modes, each with specific behavior:

#### 2.1 Regular Mode

- **Data Source**: Standard leads API (`/leads`)
- **Navigation**: Uses `useLeadsNavigationStore`
- **Context**: Basic pagination and search

#### 2.2 Bulk Search Mode

- **Data Source**: Bulk search results
- **Navigation**: Uses `useFilterAwareLeadsNavigationStore`
- **Context**: Search query and results

#### 2.3 Dynamic Filter Mode

- **Data Source**: Dynamic filter API (`/leads/dynamic-filters`)
- **Navigation**: Uses `useFilterAwareLeadsNavigationStore`
- **Context**: Complex filter combinations

#### 2.4 Grouped Leads Mode

- **Data Source**: Grouped leads API (`/leads/group/multilevel`)
- **Navigation**: Uses `useFilterAwareLeadsNavigationStore`
- **Context**: Group hierarchy and path

## Navigation Flow

### 1. Dashboard to Details Navigation

```typescript
// In useLeadsDashboard.tsx - handleRowClick function
const handleRowClick = (lead: Lead) => {
  const id = lead._id.toString();

  // Update navigation position before navigating
  const navStore = useFilterAwareLeadsNavigationStore.getState();
  const index = navStore.findFilteredIndexById(id);

  if (index >= 0) {
    navStore.setCurrentFilteredIndex(index);
  } else {
    // Fallback: calculate global index
    const currentData = isDynamicFilterMode ? dynamicFilterResults : leadsData?.data || [];
    const fallbackIndex = currentData.findIndex((item: any) => item._id === id);
    if (fallbackIndex >= 0) {
      const currentPage = isDynamicFilterMode ? dynamicFilterPage : page;
      const currentPageSize = isDynamicFilterMode ? dynamicFilterPageSize : pageSize;
      const globalIndex = (currentPage - 1) * currentPageSize + fallbackIndex;
      navStore.setCurrentFilteredIndex(globalIndex);
    }
  }

  router.push(`/dashboards/leads/${id}`);
};
```

### 2. Details Page Navigation Setup

```typescript
// In leads/[id]/page.tsx
export default function LeadDetailsPage() {
  const { apiUrl } = useApiUrlRouteHandler();
  const { defaultApiParams } = useDefaultApiStore();

  // Parse API URL to determine data source
  const apiUrlInfo = useMemo(() => {
    if (!apiUrl) return null;

    const url = new URL(apiUrl, window.location.origin);
    const endpoint = url.pathname;

    // Check if it's a grouped leads API
    const isGroupedLeadsApi = endpoint.includes('/leads/group/multilevel');

    if (isGroupedLeadsApi) {
      // Parse grouped leads API structure
      const pathParts = endpoint.split('/');
      const multilevelIndex = pathParts.indexOf('multilevel');

      // Extract fields and group path
      const fields: string[] = [];
      const groupPath: string[] = [];
      // ... parsing logic

      return {
        type: 'grouped' as const,
        fields,
        groupPath,
        params,
        enabled: navigationItems.length === 0,
      };
    }

    return null;
  }, [apiUrl, navigationItems.length]);

  // Use appropriate data source
  const { data: groupLeadsData } = useGroupLeads(
    apiUrlInfo?.type === 'grouped' ? apiUrlInfo.fields : [],
    apiUrlInfo?.type === 'grouped' ? apiUrlInfo.groupPath : [],
    apiUrlInfo?.type === 'grouped' ? apiUrlInfo.enabled : false,
    apiUrlInfo?.type === 'grouped' ? apiUrlInfo.params : undefined
  );

  const { data: leadsData } = useLeads(defaultApiParams || { page: 1, limit: 10000 }, {
    enabled: shouldFetchLeads,
  });
}
```

### 3. Navigation Between Details Pages

```typescript
// In useLeadNavigation.tsx
const goToPreviousUser = () => {
  // Check if user came from search
  if (currentFilterState?.isFromSearch === true) {
    router.push('/dashboards/leads');
    return;
  }

  // Use filtered results if available
  if (currentFilterState && totalFilteredItems > 0) {
    const previousItem = getPreviousFilteredItem();
    if (previousItem) {
      router.push(`/dashboards/leads/${previousItem._id}`);
      return;
    }
  }

  // Fallback to original navigation
  const previousUser = getPreviousLeads();
  if (previousUser) {
    router.push(`/dashboards/leads/${previousUser._id}`);
  } else {
    router.push('/dashboards/leads');
  }
};
```

## API Call Handling

### 1. Context-Aware Data Fetching

The system intelligently determines which API to call based on the navigation context:

#### 1.1 Regular Leads API

```typescript
// Standard leads with pagination and filters
const { data: leadsData } = useLeads({
  page: 1,
  limit: 10000,
  search: search || undefined,
  project_id: role === 'Agent' ? effectiveProjectId : undefined,
  agent_name: role === 'Agent' ? agentName : undefined,
  use_status: pendingLeadsComponent === true ? 'pending' : undefined,
  duplicate: filterData,
  showInactive: showinactive ? true : undefined,
  has_todo: showInTodo ? true : undefined,
  source: liveLeads ? 'live' : recycleLeads ? 'recycle' : undefined,
  sortBy: sortBy || undefined,
  sortOrder: sortOrder || undefined,
});
```

#### 1.2 Dynamic Filters API

```typescript
// Complex filter combinations
const applyDynamicFilters = useApplyDynamicFilters();
const result = await applyDynamicFilters.mutateAsync({
  filters: filterBody,
  page: 1,
  limit: 10000,
  sortBy: sortBy || undefined,
  sortOrder: sortOrder || undefined,
});
```

#### 1.3 Grouped Leads API

```typescript
// Multi-level grouped data
const { data: groupLeadsData } = useGroupLeads(fields, groupPath, enabled, params);
```

### 2. Navigation Data Population

The system fetches ALL relevant data for navigation, not just the current page:

```typescript
// In CommonLeadsDashboard.tsx - fetchAllFilteredResults
const fetchAllFilteredResults = async () => {
  let allResults: any[] = [];

  if (isBulkSearchMode && bulkSearchQuery && bulkSearchQuery.length > 0) {
    // Use bulk search results
    allResults = bulkSearchResults || [];
  } else {
    // Fetch all results with current filters
    const apiFilters = buildApiFilters();
    const simpleParams = convertFiltersToParams(apiFilters);

    if (Object.keys(simpleParams).length > 0) {
      const { apiGetLeads } = await import('@/services/LeadsService');

      // Get sort parameters from URL
      const sortBy = searchParams.get('sortBy');
      const sortOrder = searchParams.get('sortOrder');

      const response = await apiGetLeads({
        page: 1,
        limit: 10000,
        ...simpleParams,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      });
      allResults = response?.data || [];
    } else {
      allResults = leadsData?.data || [];
    }
  }

  // Update navigation store with ALL results
  setFilteredItems(allResults);
  setFilterState({
    search: search || undefined,
    duplicate: filterData,
    // ... other filter state
  });
};
```

## Filter State Management

### 1. Filter State Interface

```typescript
interface FilterState {
  search?: string;
  status?: string;
  duplicate?: number;
  dynamicFilters?: any[];
  bulkSearch?: string[];
  groupBy?: string;
  isDynamicFilterMode?: boolean;
  isBulkSearchMode?: boolean;
  isGroupedMode?: boolean;
  groupPath?: string[];
  groupFields?: string[];
  isFromSearch?: boolean;
  searchTerm?: string;
  searchResultId?: string;
}
```

### 2. Filter Mode Detection

The system automatically detects the current filter mode and adjusts navigation accordingly:

```typescript
// Priority order for data source selection
const currentDisplayedData = isBulkSearchMode
  ? bulkSearchResults
  : isDynamicFilterMode
    ? dynamicFilterResults
    : leadsData?.data || [];
```

### 3. Filter State Synchronization

Filter states are synchronized across components using Zustand stores:

```typescript
// Update filter-aware navigation store
setFilteredItems(currentFilteredData);
setFilterState({
  search: search || undefined,
  duplicate: filterData,
  use_status: pendingLeadsComponent === true ? 'pending' : undefined,
  showInactive: showinactive ? true : undefined,
  has_todo: showInTodo ? true : undefined,
  source: liveLeads ? 'live' : recycleLeads ? 'recycle' : undefined,
  sortBy: sortBy || undefined,
  sortOrder: sortOrder || undefined,
});
```

## URL Management

### 1. API URL Route Handler

```typescript
// In useApiUrlRouteHandler.ts
export const useApiUrlRouteHandler = () => {
  const pathname = usePathname();
  const { apiUrl, clearApiUrl } = useApiUrlStore();

  useEffect(() => {
    const isLeadRelatedPage = pathname.match(/^\/dashboards\/leads\/[a-f0-9]{24}$/i) ||
                             pathname === '/dashboards/leads' ||
                             // ... other lead-related pages

    // Clear API URL when navigating away from lead-related pages
    if (apiUrl && !isLeadRelatedPage) {
      clearApiUrl();
    }
  }, [pathname, apiUrl, clearApiUrl]);

  return { apiUrl };
};
```

### 2. URL Binding for Lead Details

```typescript
// Bind URL with lead name and source number
useEffect(() => {
  if (lead) {
    const contactNameSlug = lead?.contact_name?.replace(/\s+/g, '-');
    const bindNewUrl = `${currentPath}#${contactNameSlug}-${lead?.lead_source_no}`;
    router.push(bindNewUrl);
  }
}, [lead, currentPath, router]);
```

## Error Handling and Fallbacks

### 1. Navigation Fallbacks

The system implements multiple fallback strategies:

```typescript
const goToPreviousUser = () => {
  // Strategy 1: Check if from search
  if (currentFilterState?.isFromSearch === true) {
    router.push('/dashboards/leads');
    return;
  }

  // Strategy 2: Use filtered results
  if (currentFilterState && totalFilteredItems > 0) {
    const previousItem = getPreviousFilteredItem();
    if (previousItem) {
      router.push(`/dashboards/leads/${previousItem._id}`);
      return;
    }
  }

  // Strategy 3: Fallback to original navigation
  const previousUser = getPreviousLeads();
  if (previousUser) {
    router.push(`/dashboards/leads/${previousUser._id}`);
  } else {
    // Strategy 4: Navigate to leads list
    router.push('/dashboards/leads');
  }
};
```

### 2. Data Source Fallbacks

```typescript
// Priority order for data population
if (apiUrlInfo?.type === 'grouped' && groupLeadsData?.data) {
  // Priority 1: Grouped leads data
  dataToStore =
    groupLeadsData.data.leads ||
    groupLeadsData.data.offers ||
    groupLeadsData.data.openings ||
    groupLeadsData.data.payments ||
    groupLeadsData.data.confirmations;
} else if (shouldFetchLeads && leadsData?.data) {
  // Priority 2: Regular leads data
  dataToStore = leadsData.data as Lead[];
}
```

## Performance Optimizations

### 1. Memoization

```typescript
// Memoize expensive calculations
const apiUrlInfo = useMemo(() => {
  // Parse API URL logic
}, [apiUrl, navigationItems.length]);

const skeletonHeaderProps = useMemo(
  () => ({
    // Skeleton props
  }),
  [skeletonLeadData]
);
```

### 2. Conditional Data Fetching

```typescript
// Only fetch when needed
const shouldFetchLeads = navigationItems.length === 0 && !apiUrl;
const { data: leadsData } = useLeads(defaultApiParams || { page: 1, limit: 10000 }, {
  enabled: shouldFetchLeads,
});
```

### 3. Query Invalidation

```typescript
// Comprehensive query invalidation
queryClient.invalidateQueries({
  predicate: (query) => {
    const key0 = query.queryKey[0] as unknown;
    return key0 === 'leads' || key0 === 'grouped-leads' || key0 === 'group-leads';
  },
});
```

## Best Practices

### 1. Store Usage

- Use `useLeadsNavigationStore` for basic navigation
- Use `useFilterAwareLeadsNavigationStore` for filtered navigation
- Always check filter state before navigation decisions

### 2. API Calls

- Fetch ALL relevant data for navigation, not just current page
- Include sort parameters in API calls
- Use appropriate API based on navigation context

### 3. Error Handling

- Implement multiple fallback strategies
- Handle edge cases gracefully
- Provide user feedback for navigation errors

### 4. Performance

- Memoize expensive calculations
- Use conditional data fetching
- Implement proper query invalidation

## Troubleshooting

### Common Issues

1. **Navigation not working from filtered results**

   - Check if `currentFilterState` is properly set
   - Verify `filteredItems` are populated
   - Ensure `setCurrentFilteredIndex` is called before navigation

2. **Missing data in details page**

   - Check if `apiUrl` is properly set
   - Verify `defaultApiParams` are available
   - Ensure appropriate data source is selected

3. **Incorrect navigation position**
   - Verify `findFilteredIndexById` returns correct index
   - Check if global index calculation is correct
   - Ensure pagination state is properly maintained

### Debug Information

The system includes console logging for debugging:

```typescript
console.log('🔗 LeadDetailsPage - apiUrl from Zustand store:', apiUrl);
console.log('🔗 LeadDetailsPage - defaultApiParams from store:', defaultApiParams);
console.log('navigationItems', navigationItems);
```

This comprehensive navigation system ensures seamless user experience across all filter modes and data sources while maintaining performance and reliability.
