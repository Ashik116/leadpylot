# Centralized Filter System

This document explains the new centralized filter system that eliminates duplication of page-specific and role-based filter logic across components.

## Overview

Previously, filter logic was duplicated across multiple components (`StatusFilter.tsx`, `DynamicFilters.tsx`, `FilterByImport.tsx`, `GroupByFilter.tsx`). This made maintenance difficult and led to inconsistencies. The new centralized system provides:

- **Single source of truth** for all filter configurations
- **Type-safe** filter definitions
- **Easy maintenance** - change filters in one place
- **Consistent behavior** across all components
- **Role-based filtering** support
- **Page-specific filtering** support

## Architecture

### 1. Filter Configuration (`src/configs/filter.config.ts`)

The main configuration file that defines all page-specific and role-based filters.

### 2. Centralized Hook (`src/hooks/useCentralizedFilters.ts`)

A React hook that provides easy access to centralized filter logic.

## Usage Examples

### Before (Duplicated Logic)

```typescript
// In StatusFilter.tsx
const getPageSpecificFilter = (): FilterRule | null => {
  if (pathname?.includes('pending-leads')) {
    return {
      field: 'use_status',
      operator: 'equals',
      value: 'pending',
    };
  }
  // ... more duplicated logic
};

// In DynamicFilters.tsx (same logic duplicated)
const getPageSpecificFilters = () => {
  const pageFilters = allFilters.filter((filter) => {
    if (pathname?.includes('pending-leads')) {
      return filter.field === 'use_status' && filter.value === 'pending';
    }
    // ... same logic again
  });
};
```

### After (Centralized Logic)

```typescript
// In any component
import { useCentralizedFilters } from '@/hooks/useCentralizedFilters';

const MyComponent = () => {
  const { getPageSpecificFilter, getRoleBasedStatusFilters } = useCentralizedFilters();

  // Use centralized logic
  const pageFilter = getPageSpecificFilter();
  const roleFilters = getRoleBasedStatusFilters();

  // No more duplication!
};
```

## Benefits

1. **Maintainability**: Change filters in one place, affects all components
2. **Consistency**: All components use the same filter logic
3. **Type Safety**: TypeScript ensures correct filter configurations
4. **Performance**: Reduced bundle size by eliminating duplicated code
5. **Testing**: Easier to test centralized logic
6. **Documentation**: Clear documentation of all filter rules

## Migration Guide

### Step 1: Replace Imports

```typescript
// Remove these imports
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Role } from '@/configs/navigation.config/auth.route.config';

// Add this import
import { useCentralizedFilters } from '@/hooks/useCentralizedFilters';
```

### Step 2: Replace Logic

```typescript
// Remove duplicated logic
const pathname = usePathname();
const { data: session } = useSession();
const userRole = session?.user?.role;
const isAgent = userRole === Role.AGENT;

// Replace with centralized hook
const { isAgent, getPageSpecificFilter, getRoleBasedStatusFilters } = useCentralizedFilters();
```

## Adding New Pages

To add a new page with filters:

1. Add to PageType enum in `filter.config.ts`
2. Add configuration to `FILTER_CONFIGS` array
3. Use the centralized hook in components

## Troubleshooting

### Common Issues

1. **Filter not applying**: Check if the page type is correctly detected
2. **Role-based filters not working**: Verify the user role is correctly set
3. **Type errors**: Ensure all filter configurations match the `FilterConfig` interface

### Debug Mode

Enable debug logging by checking the console for filter-related logs.
