# Grouped DataTable Usage Guide

## Overview

The `DataTableOptimized` component now supports grouped rendering mode, where groups are displayed as expandable rows within a single table structure.

## Integration Steps

### 1. Enable Grouped Mode

Pass the following props to `DataTableOptimized`:

```tsx
<DataTableOptimized
  // ... existing props
  groupedMode={true}
  groupedData={groupedSummaryData}
  entityType="Lead"
  groupByFields={['team_id', 'user_id', 'status_id']}
  columns={columns}
  onRowClick={handleRowClick}
/>
```

### 2. Fetch Grouped Data

Use the `useGroupedSummary` hook to fetch grouped data:

```tsx
import { useGroupedSummary } from '@/services/hooks/useLeads';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';

function MyComponent() {
  const { groupBy, getCombinedDomainFilters } = useUniversalGroupingFilterStore();
  
  const { data: groupedData, isLoading } = useGroupedSummary({
    entityType: 'Lead',
    domain: getCombinedDomainFilters(),
    groupBy: groupBy,
    page: 1,
    limit: 50,
    enabled: groupBy.length > 0, // Only fetch when grouping is active
  });

  return (
    <DataTableOptimized
      groupedMode={groupBy.length > 0}
      groupedData={groupedData?.data || []}
      entityType="Lead"
      groupByFields={groupBy}
      columns={columns}
      loading={isLoading}
      // ... other props
    />
  );
}
```

### 3. Component Flow

```
DataTableOptimized (groupedMode=true)
  └─> DataTableBody (groupedMode=true)
      └─> LeadsGroupSummary (for each group)
          ├─> Group Summary Row (expandable)
          └─> Group Details (when expanded)
              └─> Regular Table Rows (using columns)
```

## Props Reference

### DataTableOptimized Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `groupedMode` | `boolean` | No | Enable grouped rendering mode |
| `groupedData` | `GroupSummary[]` | Yes (if groupedMode) | Array of group summaries |
| `entityType` | `string` | Yes (if groupedMode) | Entity type: 'Lead', 'Offer', etc. |
| `groupByFields` | `string[]` | No | Array of grouping field names |

### GroupSummary Structure

```typescript
interface GroupSummary {
  groupId: string;
  groupName: string;
  fieldName?: string; // Field name this group represents
  count: number;
  subGroups?: GroupSummary[]; // For nested groups
}
```

## Example: Complete Integration

```tsx
import { useGroupedSummary } from '@/services/hooks/useLeads';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import DataTableOptimized from '@/components/shared/DataTableOptimizedVersion/DataTableOptimized';

function GroupedLeadsTable() {
  const {
    groupBy,
    getCombinedDomainFilters,
    pagination,
    sorting,
  } = useUniversalGroupingFilterStore();

  const { data: groupedData, isLoading } = useGroupedSummary({
    entityType: 'Lead',
    domain: getCombinedDomainFilters(),
    groupBy: groupBy,
    page: pagination.page,
    limit: pagination.limit,
    sortBy: sorting.sortBy || undefined,
    sortOrder: sorting.sortOrder,
    enabled: groupBy.length > 0,
  });

  const handleRowClick = (row: any) => {
    // Navigate to lead detail page
    router.push(`/leads/${row._id}`);
  };

  return (
    <DataTableOptimized
      columns={leadColumns}
      groupedMode={groupBy.length > 0}
      groupedData={groupedData?.data || []}
      entityType="Lead"
      groupByFields={groupBy}
      loading={isLoading}
      onRowClick={handleRowClick}
      showHeader={true}
      showPagination={true}
      pagingData={{
        total: groupedData?.meta?.total || 0,
        pageIndex: pagination.page,
        pageSize: pagination.limit,
      }}
    />
  );
}
```

## Key Features

1. **Single Table Header**: All groups share the same table header
2. **Expandable Groups**: Click a group row to expand and see details
3. **Nested Groups**: Supports multilevel grouping with nested subgroups
4. **Pagination**: Each expanded group has its own pagination
5. **Loading States**: Shows skeleton loaders while fetching data
6. **Empty States**: Handles empty groups gracefully

## Notes

- When `groupedMode` is `false`, the table renders normally with regular rows
- Group details are fetched on-demand when a group is expanded
- The `LeadsGroupSummary` component handles all expand/collapse logic internally
- Group pagination is managed per-group in the universal store

