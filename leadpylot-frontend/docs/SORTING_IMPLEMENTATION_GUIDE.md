# Frontend Sorting Implementation Guide

This document provides a comprehensive guide for implementing standardized sorting functionality across all frontend components.

## 📋 Overview

All sorting functionality has been standardized across the backend APIs. This guide explains how to implement consistent sorting behavior in frontend components.

## ✅ What's Been Fixed

### Backend Fixes Applied (✅ Complete)
All the following endpoints now have **full sorting support**:

1. **Users** (`/users`) - ✅ Fixed
2. **Banks** (`/banks`) - ✅ Fixed  
3. **Mail Dashboard** (`/dashboards/mails` → `/email-system/admin/all`) - ✅ Fixed
4. **Mail Servers** (`/settings/mailservers`) - ✅ Fixed
5. **VOIP Servers** (`/settings/voipservers`) - ✅ Fixed
6. **Payment Terms** (`/settings/payment_terms`) - ✅ Fixed
7. **Bonus Amounts** (`/settings/bonus_amount`) - ✅ Fixed
8. **Stages** (`/settings/stage`) - ✅ Fixed
9. **Sources** (`/sources`) - ✅ Fixed  
10. **Email Templates** (`/settings/email_templates`) - ✅ Fixed
11. **PDF Templates** (`/admin/pdf-templates`) - ✅ Fixed
12. **Offers & Offers Progress** (`/offers`, `/offers/progress`) - ✅ Fixed
13. **Dynamic Filters** (`/dynamic-filters/apply`) - ✅ Fixed

### Issues Resolved:
- ❌ **Parameter inconsistency**: Frontend sent `sortBy`/`sortOrder`, backend expected different names
- ❌ **Missing implementations**: Some endpoints didn't process sorting at all
- ❌ **Limited sort fields**: Many endpoints only supported basic fields
- ❌ **Hardcoded sorting**: Dynamic Filter service ignored user sorting parameters
- ❌ **Field compatibility**: Mismatched sort fields between services

### Now Available:
- ✅ **Consistent parameters**: All endpoints use `sortBy` and `sortOrder`
- ✅ **Full implementation**: All endpoints process sorting correctly
- ✅ **Rich sort fields**: Each endpoint supports relevant business fields
- ✅ **Dynamic sorting**: Advanced filtering with proper sorting support
- ✅ **Expanded field support**: Lead service now supports 14+ sort fields

## 🔧 Standardized Parameters

### Universal Sorting Parameters
All endpoints now use the same parameter names:

```typescript
interface SortingParams {
  sortBy?: string;      // Field to sort by
  sortOrder?: 'asc' | 'desc';  // Sort direction
}
```

### ❌ Old Parameters (DO NOT USE)
- `sort_by` / `sort_order` 
- `sort` / `order`

### ✅ New Parameters (USE THESE)
- `sortBy` / `sortOrder`

## 🚀 Implementation Examples

### 1. Users Page Implementation

#### Service Layer (`UsersService.ts`)
```typescript
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  sortBy?: string;      // ✅ Standardized
  sortOrder?: string;   // ✅ Standardized
}

export async function apiGetUsers(params?: PaginationParams) {
  return ApiService.fetchDataWithAxios<GetAllUsersResponse>({
    url: '/users',
    method: 'get',
    params: {
      page: params?.page || 1,
      limit: params?.limit || 25,
      search: params?.search,
      role: params?.role,
      sortBy: params?.sortBy,     // ✅ Send as sortBy
      sortOrder: params?.sortOrder, // ✅ Send as sortOrder
    },
  });
}
```

#### Component Implementation
```typescript
// In your component
const UsersDashboard = () => {
  const searchParams = useSearchParams();
  
  // Extract sorting from URL
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  // Fetch data with sorting
  const { data: users, isLoading } = useUsers({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
    search: searchParams.get('search') || undefined,
    sortBy,      // ✅ Pass standardized param
    sortOrder,   // ✅ Pass standardized param
  });

  // Handle sort changes
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', field);
    params.set('sortOrder', direction);
    router.push(`?${params.toString()}`);
  };

  return (
    <DataTable
      data={users?.data || []}
      onSort={handleSort}
      currentSort={{ field: sortBy, direction: sortOrder as 'asc' | 'desc' }}
    />
  );
};
```

### 2. Email System Implementation

#### Service Layer
```typescript
export interface GetEmailSystemParams {
  project_id?: string;
  mailserver_id?: string;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;      // ✅ Standardized
  sortOrder?: string;   // ✅ Standardized
}

export const getAdminAllEmails = (params: GetEmailSystemParams) => {
  return ApiService.fetchDataWithAxios({
    url: '/email-system/admin/all',
    method: 'get',
    params: {
      project_id: params.project_id,
      status: params.status,
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,        // ✅ Send as sortBy
      sortOrder: params.sortOrder,  // ✅ Send as sortOrder
    },
  });
};
```

### 3. Settings Implementation

#### Service Layer
```typescript
export interface SettingsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;      // ✅ Standardized
  sortOrder?: string;   // ✅ Standardized
}

export const getSettings = (type: string, params: SettingsParams) => {
  return ApiService.fetchDataWithAxios({
    url: `/settings/${type}`,
    method: 'get',
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,        // ✅ Send as sortBy
      sortOrder: params.sortOrder,  // ✅ Send as sortOrder
    },
  });
};
```

### 4. Offers Progress Implementation

#### Service Layer
```typescript
export interface OffersProgressParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  project_id?: string;
  lead_id?: string;
  agent_id?: string;
  stage?: string;
  has_progress?: 'opening' | 'confirmation' | 'payment' | 'netto1' | 'netto2' | 'netto' | 'any';
  sortBy?: string;      // ✅ Standardized
  sortOrder?: string;   // ✅ Standardized
}

export const getOffersProgress = (params: OffersProgressParams) => {
  return ApiService.fetchDataWithAxios({
    url: '/offers/progress',
    method: 'get',
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      project_id: params.project_id,
      lead_id: params.lead_id,
      agent_id: params.agent_id,
      stage: params.stage,
      has_progress: params.has_progress,
      sortBy: params.sortBy,        // ✅ Send as sortBy
      sortOrder: params.sortOrder,  // ✅ Send as sortOrder
    },
  });
};
```

#### Component Implementation
```typescript
// In your offers progress component
const OffersProgressDashboard = () => {
  const searchParams = useSearchParams();
  
  // Extract sorting and filters from URL
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const hasProgress = searchParams.get('has_progress') || 'any';
  
  // Fetch data with sorting and filters
  const { data: offers, isLoading } = useOffersProgress({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
    search: searchParams.get('search') || undefined,
    has_progress: hasProgress as any,
    sortBy,      // ✅ Pass standardized param
    sortOrder,   // ✅ Pass standardized param
  });

  // Handle sort changes
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', field);
    params.set('sortOrder', direction);
    params.set('page', '1'); // Reset pagination
    router.push(`?${params.toString()}`);
  };

  return (
    <DataTable
      data={offers?.data || []}
      onSort={handleSort}
      currentSort={{ field: sortBy, direction: sortOrder as 'asc' | 'desc' }}
      columns={[
        {
          accessorKey: 'leadName',
          header: 'Lead Name',
          sortable: true,
        },
        {
          accessorKey: 'projectName', // ✅ New sort field
          header: 'Project',
          sortable: true,
        },
        {
          accessorKey: 'bonusAmount', // ✅ New sort field
          header: 'Bonus Amount',
          sortable: true,
        },
        {
          accessorKey: 'interestMonth',
          header: 'Interest (Months)',
          sortable: true,
        },
        // ... other columns
      ]}
    />
  );
};
```

### 5. Dynamic Filters Implementation

#### Service Layer
```typescript
export interface DynamicFilterParams {
  filters: FilterRule[];
  page?: number;
  limit?: number;
  sortBy?: string;      // ✅ Standardized
  sortOrder?: string;   // ✅ Standardized
}

export interface FilterRule {
  field: string;
  operator: string;
  value: any;
}

export const applyDynamicFilters = (params: DynamicFilterParams) => {
  return ApiService.fetchDataWithAxios({
    url: '/dynamic-filters/apply',
    method: 'post',
    data: {
      filters: params.filters,
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,        // ✅ Send as sortBy
      sortOrder: params.sortOrder,  // ✅ Send as sortOrder
    },
  });
};
```

#### Component Implementation
```typescript
// In your dynamic filter component
const DynamicFilterDashboard = () => {
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const searchParams = useSearchParams();
  
  // Extract sorting from URL
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  // Fetch data with filters and sorting
  const { data: leads, isLoading } = useDynamicFilters({
    filters,
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
    sortBy,      // ✅ Pass standardized param
    sortOrder,   // ✅ Pass standardized param
  });

  // Handle sort changes
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', field);
    params.set('sortOrder', direction);
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  return (
    <div>
      <FilterBuilder filters={filters} onChange={setFilters} />
      <DataTable
        data={leads?.data || []}
        onSort={handleSort}
        currentSort={{ field: sortBy, direction: sortOrder as 'asc' | 'desc' }}
        columns={[
          {
            accessorKey: 'contact_name',
            header: 'Contact Name',
            sortable: true,
          },
          {
            accessorKey: 'expected_revenue',
            header: 'Revenue',
            sortable: true,
          },
          {
            accessorKey: 'status',
            header: 'Status',
            sortable: true,
          },
          // ... other columns
        ]}
      />
    </div>
  );
};
```

## 🎯 Allowed Sort Fields by Endpoint

### Users (`/users`)
```typescript
type UserSortFields = 
  | 'name'        // User name
  | 'email'       // User email
  | 'role'        // User role
  | 'status'      // Active status
  | 'login'       // Login username
  | 'createdAt'   // Creation date
  | 'updatedAt';  // Last update date
```

### Banks (`/banks`)
```typescript
type BankSortFields = 
  | 'name'        // Bank name
  | 'state'       // Bank state/status
  | 'country'     // Bank country
  | 'createdAt'   // Creation date
  | 'updatedAt';  // Last update date
```

### Email System (`/email-system/admin/all`, `/email-system/admin/pending`)
```typescript
type EmailSortFields = 
  | 'received_at' // When email was received
  | 'subject'     // Email subject
  | 'from'        // Sender address
  | 'priority'    // Email priority
  | 'created_at'; // Creation timestamp
```

### Settings (`/settings/:type`)
Settings endpoints now support type-specific sort fields:

#### Payment Terms (`/settings/payment_terms`)
```typescript
type PaymentTermsSortFields = 
  | 'name'        // Setting name
  | 'type'        // Payment type
  | 'months'      // Number of months
  | 'createdAt'   // Creation date
  | 'updatedAt';  // Last update date
```

#### Bonus Amounts (`/settings/bonus_amount`)
```typescript
type BonusAmountSortFields = 
  | 'name'        // Setting name
  | 'bonus_amount'// Bonus amount value
  | 'amount'      // Amount value
  | 'code'        // Bonus code
  | 'createdAt'   // Creation date
  | 'updatedAt';  // Last update date
```

#### Stages (`/settings/stage`)
```typescript
type StageSortFields = 
  | 'name'        // Stage name
  | 'description' // Stage description
  | 'createdAt'   // Creation date
  | 'updatedAt';  // Last update date
```

#### Email Templates (`/settings/email_templates`)
```typescript
type EmailTemplateSortFields = 
  | 'name'        // Template name
  | 'slug'        // Template slug
  | 'createdAt'   // Creation date
  | 'updatedAt';  // Last update date
```

#### Other Settings Types (mailservers, voipservers, etc.)
```typescript
type GeneralSettingsSortFields = 
  | 'name'        // Setting name
  | 'createdAt'   // Creation date
  | 'updatedAt';  // Last update date
```

### Sources (`/sources`)
```typescript
type SourcesSortFields = 
  | 'name'        // Source name
  | 'price'       // Source price
  | 'provider'    // Provider name
  | 'lead_count'  // Number of leads
  | 'createdAt'   // Creation date
  | 'updatedAt';  // Last update date
```

### PDF Templates (`/admin/pdf-templates`)
```typescript
type PdfTemplateSortFields = 
  | 'name'        // Template name
  | 'status'      // Template status
  | 'category'    // Template category
  | 'createdAt'   // Creation date
  | 'updatedAt';  // Last update date
```

### Offers & Offers Progress (`/offers`, `/offers/progress`)
```typescript
type OffersSortFields = 
  | 'title'              // Offer title
  | 'investment_volume'  // Investment amount
  | 'interest_rate'      // Interest rate
  | 'status'            // Offer status
  | 'createdAt'         // Creation date
  | 'updatedAt'         // Last update date (DEFAULT for progress)
  | 'created_at'        // Creation timestamp
  | 'updated_at'        // Update timestamp
  | 'leadName'          // Lead contact name
  | 'contactName'       // Contact name (alias for leadName)
  | 'partnerId'         // Partner/Lead source number
  | 'agent'             // Agent login name
  | 'interestMonth'     // Payment terms (months)
  | 'bankName'          // Bank name
  | 'projectName'       // Project name
  | 'bonusAmount';      // Bonus amount value
```

### Dynamic Filters (`/dynamic-filters/apply`)
```typescript
type DynamicFilterSortFields = 
  | 'contact_name'      // Lead contact name
  | 'email_from'        // Email address
  | 'phone'             // Phone number
  | 'status'            // Lead status
  | 'stage'             // Lead stage
  | 'use_status'        // Use status
  | 'duplicate_status'  // Duplicate status (0, 1, 2)
  | 'expected_revenue'  // Expected revenue
  | 'lead_date'         // Lead date
  | 'assigned_date'     // Assignment date
  | 'createdAt'         // Creation date
  | 'updatedAt'         // Last update date
  | 'active';           // Active status
```

**Note**: Dynamic Filters also support computed fields like `lead_count`, `total_revenue`, `avg_revenue` and reference fields like `project.name`, `agent.login`, `agent.first_name`, `agent.last_name`, `source.name` for advanced filtering scenarios.

**Default Sorting Behavior**:
- **Offers Progress** (`/offers/progress`): Defaults to `updatedAt DESC` - newest updates first
- **Regular Offers** (`/offers`): Defaults to `createdAt DESC` - newest created first

This ensures that when you move an offer to opening/payment/netto status, it appears at the top of the progress lists.

## 🧩 Reusable Hook Pattern

Create a reusable sorting hook for consistent behavior:

```typescript
// hooks/useSorting.ts
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';

export interface SortState {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const useSorting = (defaultSort: SortState = { sortBy: 'createdAt', sortOrder: 'desc' }) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentSort: SortState = {
    sortBy: searchParams.get('sortBy') || defaultSort.sortBy,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || defaultSort.sortOrder,
  };

  const handleSort = useCallback((field: string, direction?: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    
    // Toggle direction if clicking same field
    const newDirection = direction || 
      (field === currentSort.sortBy && currentSort.sortOrder === 'asc' ? 'desc' : 'asc');
    
    params.set('sortBy', field);
    params.set('sortOrder', newDirection);
    params.set('page', '1'); // Reset to first page when sorting
    
    router.push(`?${params.toString()}`);
  }, [searchParams, router, currentSort]);

  return {
    currentSort,
    handleSort,
  };
};
```

## 🎨 DataTable Integration

### Enhanced DataTable Props
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  currentSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  // ... other props
}
```

### Usage Example
```typescript
const UsersList = () => {
  const { currentSort, handleSort } = useSorting({ sortBy: 'name', sortOrder: 'asc' });
  
  const { data: users } = useUsers({
    page: 1,
    limit: 50,
    sortBy: currentSort.sortBy,
    sortOrder: currentSort.sortOrder,
  });

  return (
    <DataTable
      data={users?.data || []}
      columns={userColumns}
      onSort={handleSort}
      currentSort={{
        field: currentSort.sortBy,
        direction: currentSort.sortOrder,
      }}
    />
  );
};
```

## 🔍 URL State Management

### URL Structure
All sorted pages should follow this URL pattern:
```
/page-name?sortBy=fieldName&sortOrder=asc&page=1&limit=50
```

### Examples
```
✅ /users?sortBy=name&sortOrder=asc&page=1
✅ /banks?sortBy=state&sortOrder=desc&search=deutsche
✅ /dashboards/mails?sortBy=received_at&sortOrder=desc
✅ /settings/mailservers?sortBy=name&sortOrder=asc
✅ /settings/payment_terms?sortBy=type&sortOrder=desc
✅ /settings/bonus_amount?sortBy=amount&sortOrder=asc
✅ /settings/stage?sortBy=description&sortOrder=asc
✅ /settings/email_templates?sortBy=slug&sortOrder=desc
✅ /sources?sortBy=price&sortOrder=desc
✅ /admin/pdf-templates?sortBy=status&sortOrder=asc
✅ /offers?sortBy=investment_volume&sortOrder=desc
✅ /offers/progress?sortBy=leadName&sortOrder=asc&has_progress=opening
✅ /offers/progress?sortBy=projectName&sortOrder=asc&has_progress=confirmation
✅ /offers/progress?sortBy=bonusAmount&sortOrder=desc&has_progress=payment
✅ /dynamic-filters/apply (POST with sortBy=contact_name&sortOrder=asc in body)
✅ /dynamic-filters/apply (POST with sortBy=expected_revenue&sortOrder=desc in body)
```

## ⚡ Performance Considerations

### Client-Side vs Server-Side Sorting

#### Server-Side Sorting (Recommended)
- ✅ Better performance for large datasets
- ✅ Consistent with pagination
- ✅ Reduces memory usage
- ✅ Works with search/filtering

```typescript
// Server-side sorting - data comes pre-sorted from API
const { data } = useUsers({
  sortBy: 'name',
  sortOrder: 'asc'
});
```

#### Client-Side Sorting (Only for small datasets)
```typescript
// Only use for datasets < 100 items
const sortedData = useMemo(() => {
  if (!data || !sortBy) return data;
  
  return [...data].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
}, [data, sortBy, sortOrder]);
```

## 🚨 Migration Checklist

### For Existing Components

#### **✅ COMPLETED - No Action Required**
The following pages have been fully fixed in the backend:
- [x] **Users** - Full sorting support with name, email, role, status, login, createdAt, updatedAt
- [x] **Banks** - Full sorting support with name, state, country, createdAt, updatedAt
- [x] **Email System (Mails Dashboard)** - Full sorting support with received_at, subject, from, priority, created_at
- [x] **Settings (All Types)** - Type-specific sorting fields implemented
- [x] **Sources** - Full sorting support with name, price, provider, lead_count, createdAt, updatedAt  
- [x] **PDF Templates** - Full sorting support with name, status, category, createdAt, updatedAt
- [x] **Offers & Offers Progress** - Full sorting support with title, investment_volume, interest_rate, status, leadName, projectName, bonusAmount, agent, partnerId, bankName, interestMonth, createdAt, updatedAt
- [x] **Dynamic Filters** - Full sorting support with 14+ lead fields including contact_name, email_from, phone, status, stage, use_status, duplicate_status, expected_revenue, lead_date, assigned_date, createdAt, updatedAt, active

#### **🔄 FRONTEND TASKS REMAINING**

1. **Update Service Layer**
   - [ ] Verify all services are using `sortBy` and `sortOrder` parameters
   - [ ] Remove any remaining old parameter names (`sort_by`, `sort_order`, `sort`, `order`)
   - [ ] Update TypeScript interfaces to match new sort fields

2. **Update Components**
   - [ ] Test that URL params are being read correctly
   - [ ] Verify correct parameters are passed to service hooks
   - [ ] Confirm sort handlers use new parameter names

3. **Update DataTable Integration**
   - [ ] Ensure `onSort` handlers use correct parameter names
   - [ ] Update column sorting configurations with new field names
   - [ ] Test sort direction toggling

4. **Test Thoroughly**
   - [ ] Test all new sort fields work in both directions
   - [ ] Verify URL state management
   - [ ] Ensure pagination resets on sort change
   - [ ] Test combination with search/filtering

## 🐛 Common Issues & Solutions

### Issue: Sorting not working
**Solution:** Check that you're using `sortBy` and `sortOrder`, not old parameter names.

### Issue: Dynamic Filter sorting not working
**Solution:** Ensure you're passing `sortBy` and `sortOrder` in the request body, not as URL parameters:
```typescript
// ✅ Correct - in request body
const response = await ApiService.fetchDataWithAxios({
  url: '/dynamic-filters/apply',
  method: 'post',
  data: {
    filters: [...],
    sortBy: 'contact_name',
    sortOrder: 'asc'
  }
});

// ❌ Wrong - as URL parameters
const response = await ApiService.fetchDataWithAxios({
  url: '/dynamic-filters/apply?sortBy=contact_name&sortOrder=asc',
  method: 'post',
  data: { filters: [...] }
});
```

### Issue: Sort direction not toggling correctly
**Solution:** Implement proper direction logic in your sort handler:
```typescript
const newDirection = field === currentSort.sortBy && currentSort.sortOrder === 'asc' 
  ? 'desc' 
  : 'asc';
```

### Issue: Pagination broken after sorting
**Solution:** Reset page to 1 when sorting:
```typescript
params.set('page', '1');
```

### Issue: URL not updating
**Solution:** Ensure you're using `router.push()` with the updated URLSearchParams.

### Issue: Dynamic Filters not sorting server-side
**Solution:** Remember that Dynamic Filters use POST method. The sorting happens server-side automatically when you pass `sortBy` and `sortOrder` in the request body. Unlike other endpoints that use URL parameters, Dynamic Filters receive the sorting parameters in the POST body alongside the filters array.

## 📚 Additional Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [URLSearchParams MDN](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)

## 🔄 API Response Format

Most sorted endpoints return data in this format:
```typescript
interface SortedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
```

### Dynamic Filters Response Format
Dynamic filters return enhanced response with additional metadata:
```typescript
interface DynamicFilterResponse<T> {
  status: 'success';
  data: T[];
  meta: {
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      currentPageSize: number;
    };
    filters: {
      applied: FilterRule[];
      count: number;
      totalFiltered: number;
    };
    performance: {
      executionTime: number;
      performanceLevel: 'fast' | 'moderate' | 'slow';
    };
  };
  appliedSort: SortField[]; // Applied sorting info for debugging
  executionTime: number;
}
```

## 🎯 Next Steps

1. Start with the Users page as a reference implementation
2. Apply the same pattern to Banks, Settings, and Email pages
3. Create reusable components and hooks for consistent behavior
4. Test thoroughly across all browsers and devices

---

**Need help?** Contact the backend team if you encounter any issues or need additional sorting fields added to specific endpoints.
