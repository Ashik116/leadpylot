# BaseTable Component

A comprehensive, feature-rich table component built on top of TanStack Table with advanced functionality including search, pagination, sorting, bulk actions, and responsive column sizing.

## Features

- **Fully Responsive Column Sizing**: Columns automatically size based on content, with optional custom width support
- **Search & Filtering**: Built-in search functionality with customizable placeholders
- **Pagination**: Server-side pagination with customizable page sizes
- **Sorting**: Client-side and server-side sorting support
- **Bulk Actions**: Select multiple rows and perform bulk operations
- **Row Selection**: Individual row selection with select all functionality
- **Column Customization**: Show/hide columns with persistent state
- **Expanded Rows**: Support for expandable row content
- **Loading States**: Skeleton loading with customizable avatars
- **Empty States**: Customizable no-data display
- **Action Bar**: Built-in action bar with search, column controls, and bulk actions

## Responsive Column Sizing

The table now supports fully responsive column sizing with the following behavior:

### Auto-sizing (Default)
Columns automatically size based on their content. No extra padding or hardcoded widths are applied.

```typescript
const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    // No columnWidth specified - will auto-size based on content
  },
  {
    id: 'email',
    header: 'Email',
    accessorKey: 'email',
    // No columnWidth specified - will auto-size based on content
  }
];
```

### Custom Width
You can specify a custom width for any column using the `columnWidth` property:

```typescript
const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    columnWidth: 200, // Fixed width of 200px
  },
  {
    id: 'email',
    header: 'Email',
    accessorKey: 'email',
    columnWidth: '150px', // Fixed width of 150px (string format)
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    // No columnWidth - will auto-size based on content
  }
];
```

### Empty Table Behavior
When the table has no data, headers only take the space needed for their title text, ensuring optimal space utilization.

## Basic Usage

```typescript
import BaseTable from '@/components/shared/BaseTable';
import { ColumnDef } from '@/components/shared/DataTable';

interface User {
  _id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
  },
  {
    id: 'email',
    header: 'Email',
    accessorKey: 'email',
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => (
      <span className={`px-2 py-1 rounded-full text-xs ${
        row.original.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {row.original.status}
      </span>
    ),
  },
];

const MyTable = () => {
  return (
    <BaseTable
      tableName="users-table"
      columns={columns}
      data={users}
      loading={isLoading}
      totalItems={totalUsers}
      pageIndex={currentPage}
      pageSize={pageSize}
      search={searchTerm}
      selectable={true}
      bulkActionsConfig={{
        entityName: 'user',
        deleteUrl: '/api/users',
        invalidateQueries: ['users'],
      }}
    />
  );
};
```

## Props

### BaseTableConfig

| Prop | Type | Description |
|------|------|-------------|
| `tableName` | `string` | Unique identifier for the table |
| `data` | `T[]` | Array of data to display |
| `loading` | `boolean` | Loading state |
| `totalItems` | `number` | Total number of items for pagination |
| `pageIndex` | `number` | Current page index |
| `pageSize` | `number` | Number of items per page |
| `pageSizes` | `number[]` | Available page size options |
| `search` | `string` | Current search term |
| `searchPlaceholder` | `string` | Placeholder for search input |
| `columns` | `ColumnDef<T>[]` | Column definitions |
| `selectable` | `boolean` | Enable row selection |
| `rowIdField` | `string` | Field to use as row ID (default: '_id') |
| `returnFullObjects` | `boolean` | Return full objects instead of IDs for selection |
| `onRowClick` | `(row: T) => void` | Row click handler |
| `rowClassName` | `string \| ((row: Row<T>) => string)` | Row CSS class |
| `renderExpandedRow` | `(row: Row<T>) => ReactNode` | Expanded row content |
| `showHeader` | `boolean` | Show table header |
| `headerSticky` | `boolean` | Make header sticky |

### Column Definition

```typescript
interface ColumnDef<T> {
  id?: string;
  header: string | ReactNode | ((props: HeaderContext<T>) => ReactNode);
  accessorKey?: keyof T;
  cell?: (props: CellContext<T>) => ReactNode;
  columnWidth?: number | string; // Optional custom width
  sortable?: boolean;
  // ... other TanStack Table properties
}
```

## Advanced Features

### Bulk Actions

```typescript
const bulkActionsConfig = {
  entityName: 'user',
  deleteUrl: '/api/users',
  invalidateQueries: ['users'],
  singleDeleteConfig: {
    deleteFunction: deleteUser,
    onSuccess: (response, deletedId) => {
      // Handle success
    },
    onError: (error) => {
      // Handle error
    },
  },
};
```

### Global Select All

```typescript
const globalSelectAll = {
  enabled: true,
  onSelectAllData: () => getAllUserIds(), // Function to get all data IDs
  onDeselectAllData: () => clearAllSelections(), // Function to clear all selections
};
```

### Custom Actions

```typescript
const customActions = (
  <div className="flex gap-2">
    <Button variant="solid">Export</Button>
    <Button variant="outline">Import</Button>
  </div>
);
```

### Expanded Rows

```typescript
const renderExpandedRow = (row: Row<User>) => (
  <div className="p-4 bg-gray-50">
    <h3>Details for {row.original.name}</h3>
    <p>Email: {row.original.email}</p>
    {/* More details */}
  </div>
);
```

## Styling

The component uses Tailwind CSS classes and can be customized through:

- `tableClassName`: Custom CSS class for the table container
- `rowClassName`: Custom CSS class for table rows
- `tableHeaderClassName`: Custom CSS class for table headers

## Responsive Behavior

- **Desktop**: Full feature set with all controls visible
- **Tablet**: Responsive column sizing with horizontal scroll when needed
- **Mobile**: Optimized for touch interaction with simplified controls

## Performance

- Virtual scrolling for large datasets
- Debounced search input
- Optimized re-renders with React.memo
- Efficient column visibility management

## Accessibility

- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support

## Examples

See `BaseTableExample.tsx` for comprehensive usage examples including:

1. Simple table with basic functionality
2. Table with bulk actions
3. Table with expanded rows
4. Table with custom footer
5. Table with responsive column sizing

## Migration Guide

### From Previous Version

If you're upgrading from a previous version:

1. **Column Width**: Remove any hardcoded width styles from your columns
2. **Responsive Breakpoints**: The component now handles responsive behavior automatically
3. **Empty States**: Headers now take minimal space when table is empty

### Breaking Changes

- Removed `maxSize` property from select columns
- Removed responsive breakpoint-based column sizing
- Simplified column width handling

## Troubleshooting

### Common Issues

1. **Columns not sizing correctly**: Ensure you're not setting `columnWidth` unless you need a fixed width
2. **Table not responsive**: Check that you're not overriding the table's CSS classes
3. **Selection not working**: Verify that `rowIdField` matches your data structure

### Performance Tips

1. Use `useMemo` for column definitions
2. Implement proper `rowIdField` for efficient selection
3. Use `returnFullObjects: false` when possible for better performance
4. Debounce search inputs for large datasets
