# Clean Architecture Guide - leadpylot Frontend

This guide outlines the clean architecture principles, patterns, and best practices for the leadpylot frontend application. It complements the cursor rules and provides detailed examples and rationale.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Layer Breakdown](#layer-breakdown)
3. [SOLID Principles](#solid-principles)
4. [Component Architecture](#component-architecture)
5. [Hook Architecture](#hook-architecture)
6. [Service Layer](#service-layer)
7. [State Management](#state-management)
8. [Real-World Examples](#real-world-examples)
9. [Refactoring Checklist](#refactoring-checklist)

---

## Architecture Overview

### Layered Clean Architecture

The frontend follows a **4-layer clean architecture** with clear boundaries and dependencies flowing inward:

```
┌──────────────────────────────────────────────┐
│   Presentation Layer (Components, Pages)     │
│   - React components, UI logic               │
│   - Minimal business logic                   │
└──────────────────────────────────────────────┘
                     ↓ depends on
┌──────────────────────────────────────────────┐
│   Business Logic Layer (Hooks, Stores)       │
│   - State management (Zustand)               │
│   - Custom hooks (business logic)            │
│   - Form validation & transformation         │
└──────────────────────────────────────────────┘
                     ↓ depends on
┌──────────────────────────────────────────────┐
│   Data Access Layer (Services, React Query)  │
│   - API calls (LeadsService, ProjectsService)│
│   - Data transformation                      │
│   - Caching & synchronization                │
└──────────────────────────────────────────────┘
                     ↓ depends on
┌──────────────────────────────────────────────┐
│   External Layer (APIs, Databases)           │
│   - Backend APIs                             │
│   - Third-party services                     │
└──────────────────────────────────────────────┘
```

### Dependency Rules

1. **High-level layers depend on abstractions, not concrete implementations**
2. **Dependencies always point inward** - outer layers can't know about inner layers
3. **Each layer has minimal responsibility** - separates concerns
4. **Testability improves with each layer** - inner layers are pure functions

---

## Layer Breakdown

### 1. Presentation Layer (Components)

**Responsibility:** Render UI based on props

**What it handles:**

- React component rendering
- User interactions (clicks, inputs)
- Conditional rendering based on props
- Styling

**What it delegates:**

- ❌ Does NOT fetch data directly
- ❌ Does NOT manage complex state
- ❌ Does NOT handle business logic
- ✅ Receives data & handlers via props

**Example:**

```tsx
// ✅ GOOD: Pure presentation component
interface LeadCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  isSelected: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onSelect, isSelected }) => (
  <div
    className={`rounded border p-4 ${isSelected ? 'bg-blue-50' : ''}`}
    onClick={() => onSelect(lead)}
  >
    <h3>{lead.email}</h3>
    <p>
      {lead.firstName} {lead.lastName}
    </p>
  </div>
);
```

### 2. Business Logic Layer (Hooks & Stores)

**Responsibility:** Manage application state and transformations

**What it handles:**

- State management (useState, Zustand)
- Business logic & calculations
- Data transformations
- Form validation
- Side effects orchestration

**What it delegates:**

- ❌ Does NOT directly render UI
- ❌ Does NOT make API calls (uses services)
- ✅ Calls service functions
- ✅ Orchestrates multiple services

**Example:**

```tsx
// ✅ GOOD: Hook with clear responsibility
const useLeadForm = (initialLead?: Lead) => {
  const [formData, setFormData] = useState<Partial<Lead>>(initialLead || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Business logic: validation
  const validate = useCallback((data: Partial<Lead>) => {
    const newErrors: Record<string, string> = {};

    if (!data.email?.includes('@')) {
      newErrors.email = 'Invalid email';
    }
    if (!data.firstName?.trim()) {
      newErrors.firstName = 'First name required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  // Business logic: submission
  const handleSubmit = useCallback(async () => {
    if (!validate(formData)) return false;

    try {
      await apiCreateLead(formData as CreateLeadRequest);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }, [formData, validate]);

  return {
    formData,
    setFormData,
    errors,
    validate,
    handleSubmit,
    isValid: Object.keys(errors).length === 0,
  };
};
```

### 3. Data Access Layer (Services)

**Responsibility:** Abstract all data access and API communication

**What it handles:**

- API calls (GET, POST, PATCH, DELETE)
- Response transformation
- Error handling for API failures
- Request composition

**What it delegates:**

- ❌ Does NOT manage component state
- ❌ Does NOT handle UI logic
- ✅ Uses ApiService for consistency
- ✅ Returns typed responses

**Example:**

```tsx
// ✅ GOOD: Service with focused API functions
export interface LeadFilters {
  search?: string;
  status?: string;
  assignedAgent?: string;
  page?: number;
  limit?: number;
}

export interface CreateLeadRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// Pure API functions - no side effects
export async function apiGetLeads(filters: LeadFilters) {
  return ApiService.fetchDataWithAxios<GetAllLeadsResponse>({
    url: '/leads',
    method: 'get',
    params: filters,
  });
}

export async function apiGetLeadById(leadId: string) {
  return ApiService.fetchDataWithAxios<Lead>({
    url: `/leads/${leadId}`,
    method: 'get',
  });
}

export async function apiCreateLead(data: CreateLeadRequest) {
  return ApiService.fetchDataWithAxios<Lead>({
    url: '/leads',
    method: 'post',
    data,
  });
}

export async function apiUpdateLead(leadId: string, data: Partial<Lead>) {
  return ApiService.fetchDataWithAxios<Lead>({
    url: `/leads/${leadId}`,
    method: 'patch',
    data,
  });
}

export async function apiDeleteLead(leadId: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/leads/${leadId}`,
    method: 'delete',
  });
}
```

### 4. External Layer

**Responsibility:** Backend APIs and third-party integrations

**What it handles:**

- REST endpoints
- Database operations
- External service calls

**What we control:**

- ✅ Response format (should align with our TypeScript interfaces)
- ✅ Error responses
- ❌ We don't control external APIs (only adapt them)

---

## SOLID Principles

### Single Responsibility Principle (SRP)

**Each module/component/function has ONE reason to change**

```tsx
// ❌ BAD: Multiple responsibilities
const LeadPage = () => {
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({});

  // Data fetching
  useEffect(() => {
    /* fetch logic */
  }, []);

  // Filtering logic
  const filteredLeads = useMemo(() => {
    return leads.filter(/* complex logic */);
  }, [leads, filters]);

  // Selection logic
  const handleSelect = () => {
    /* complex logic */
  };

  // Rendering
  return <div>{/* 300+ lines of JSX */}</div>;
};

// ✅ GOOD: Separated responsibilities
// Hook 1: Data fetching
const useLeadData = () =>
  useQuery({
    queryKey: ['leads'],
    queryFn: apiGetLeads,
  });

// Hook 2: Filtering logic
const useLeadFilters = (leads: Lead[]) => {
  const [filters, setFilters] = useState({});
  const filtered = useMemo(() => {
    return leads.filter(/* logic */);
  }, [leads, filters]);
  return { filters, setFilters, filtered };
};

// Hook 3: Selection logic
const useLeadSelection = (leads: Lead[]) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  return { selectedIds, handleSelect };
};

// Component: Orchestrates above hooks
const LeadPage = () => {
  const { data: leads } = useLeadData();
  const { filters, setFilters, filtered } = useLeadFilters(leads || []);
  const { selectedIds, handleSelect } = useLeadSelection(leads || []);

  return (
    <div>
      <LeadFilters filters={filters} onChange={setFilters} />
      <LeadList leads={filtered} selectedIds={selectedIds} onSelect={handleSelect} />
    </div>
  );
};
```

### Open/Closed Principle (OCP)

**Code should be open for extension, closed for modification**

```tsx
// ❌ BAD: Adding new status requires modifying component
const LeadStatusBadge = ({ status }: { status: string }) => {
  if (status === 'active') return <span className="bg-green">Active</span>;
  if (status === 'inactive') return <span className="bg-gray">Inactive</span>;
  if (status === 'pending') return <span className="bg-yellow">Pending</span>;
  // Add another status? Must modify component
};

// ✅ GOOD: Extensible through configuration
type StatusConfig = {
  [key: string]: {
    label: string;
    bgColor: string;
    textColor: string;
  };
};

const statusConfig: StatusConfig = {
  active: { label: 'Active', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  inactive: { label: 'Inactive', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
  pending: { label: 'Pending', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  // Easy to add: no code changes needed
  suspended: { label: 'Suspended', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

interface LeadStatusBadgeProps {
  status: string;
  config?: StatusConfig;
}

const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({ status, config = statusConfig }) => {
  const cfg = config[status];
  if (!cfg) return null;

  return <span className={`rounded px-3 py-1 ${cfg.bgColor} ${cfg.textColor}`}>{cfg.label}</span>;
};

// Usage: Easy to extend without modifying component
const customConfig: StatusConfig = {
  ...statusConfig,
  custom: { label: 'Custom', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
};

<LeadStatusBadge status="custom" config={customConfig} />;
```

### Liskov Substitution Principle (LSP)

**Subtypes must be substitutable for their base types**

```tsx
// ✅ GOOD: Consistent interfaces allow substitution
interface ITableAdapter<T> {
  getColumns(): ColumnDef<T>[];
  transformData(data: any[]): T[];
  onRowClick(row: T): void;
}

// Different implementations, same interface
const LeadTableAdapter: ITableAdapter<Lead> = {
  getColumns: () => leadColumns,
  transformData: (data) => data.map(transformLead),
  onRowClick: (lead) => navigateToLead(lead._id),
};

const ProjectTableAdapter: ITableAdapter<Project> = {
  getColumns: () => projectColumns,
  transformData: (data) => data.map(transformProject),
  onRowClick: (project) => navigateToProject(project._id),
};

// Generic table component works with any adapter
const BaseTable = <T extends any>({
  adapter,
  data,
}: {
  adapter: ITableAdapter<T>;
  data: any[];
}) => {
  const transformed = adapter.transformData(data);
  return (
    <table>
      {/* renders using adapter methods */}
    </table>
  );
};

// Works with different adapters without modification
<BaseTable adapter={LeadTableAdapter} data={leadsData} />
<BaseTable adapter={ProjectTableAdapter} data={projectsData} />
```

### Interface Segregation Principle (ISP)

**Depend on specific interfaces, not broad ones**

```tsx
// ❌ BAD: Large monolithic interface
interface AllTableProps {
  data: any[];
  columns: any[];
  loading?: boolean;
  onSort?: () => void;
  onFilter?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  selectable?: boolean;
  onSelectAll?: () => void;
  onDeselect?: () => void;
  showPagination?: boolean;
  onPageChange?: () => void;
  // 20+ more props...
}

// ✅ GOOD: Segregated interfaces based on concern
interface BaseTableProps {
  data: any[];
  columns: ColumnDef[];
  loading?: boolean;
}

interface SelectableTableProps extends BaseTableProps {
  selectable?: boolean;
  onSelectChange?: (selected: any[]) => void;
}

interface SortableTableProps extends BaseTableProps {
  onSort?: (key: string, order: 'asc' | 'desc') => void;
}

interface PaginatedTableProps extends BaseTableProps {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  onPaginationChange?: (page: number, size: number) => void;
}

// Compose based on needs
const SimpleTable = (props: BaseTableProps) => {
  /* */
};
const SelectableLeadTable = (props: SelectableTableProps) => {
  /* */
};
const FullFeaturedTable = (
  props: BaseTableProps & SelectableTableProps & SortableTableProps & PaginatedTableProps
) => {
  /* */
};
```

### Dependency Inversion Principle (DIP)

**High-level modules depend on abstractions, not low-level details**

```tsx
// ❌ BAD: Direct dependency on concrete service
const LeadForm = () => {
  const handleSubmit = async (data) => {
    // Tight coupling to LeadsService
    const result = await LeadsService.createLead(data);
    // Direct dependency makes testing hard
  };
};

// ✅ GOOD: Dependency injection through props/context
interface ILeadService {
  createLead(data: CreateLeadRequest): Promise<Lead>;
  updateLead(id: string, data: Partial<Lead>): Promise<Lead>;
}

const LeadServiceContext = React.createContext<ILeadService | null>(null);

interface LeadFormProps {
  leadService: ILeadService;
}

const LeadForm: React.FC<LeadFormProps> = ({ leadService }) => {
  const handleSubmit = async (data) => {
    // Depends on abstraction, not concrete impl
    const result = await leadService.createLead(data);
  };
};

// Usage: Easy to swap implementations
<LeadForm leadService={realLeadService} />
<LeadForm leadService={mockLeadService} /> // For testing
```

---

## Component Architecture

### Component Types & Patterns

#### 1. Presentational Components (Pure Components)

**Purpose:** Render UI based on props only

```tsx
interface LeadListProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  isLoading?: boolean;
}

export const LeadList: React.FC<LeadListProps> = ({ leads, onLeadClick, isLoading = false }) => {
  if (isLoading) return <Spinner />;
  if (!leads.length) return <EmptyState />;

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <LeadListItem key={lead._id} lead={lead} onClick={() => onLeadClick(lead)} />
      ))}
    </div>
  );
};
```

**Benefits:**

- ✅ Easy to test (pure functions)
- ✅ Highly reusable
- ✅ Easy to reason about
- ✅ Can use memoization for performance

#### 2. Container Components (Smart Components)

**Purpose:** Manage state and data, delegate rendering

```tsx
export const LeadListContainer = () => {
  const { data: leads, isLoading } = useLeadData();
  const { selectedIds, handleSelect } = useLeadSelection();

  return (
    <LeadList
      leads={leads || []}
      selectedIds={selectedIds}
      onLeadClick={(lead) => handleSelect(lead._id)}
      isLoading={isLoading}
    />
  );
};
```

**Benefits:**

- ✅ Manages all state for a feature
- ✅ Orchestrates hooks & services
- ✅ Separates concerns from presentation

#### 3. Orchestrator Components (Feature Components)

**Purpose:** Compose multiple sub-components & hooks

```tsx
export const LeadDetailsPage = ({ leadId }: { leadId: string }) => {
  // Orchestrate multiple hooks
  const { data: lead, isLoading: leadLoading } = useLeadData(leadId);
  const { formData, handlers, errors } = useLeadForm(lead);
  const { actions } = useLeadActions(leadId);

  return (
    <div className="space-y-4">
      <LeadHeader lead={lead} onDelete={actions.delete} />
      <LeadForm initialData={lead} onSubmit={handlers.submit} errors={errors} />
      <LeadDetails lead={lead} />
    </div>
  );
};
```

**Benefits:**

- ✅ High-level overview of feature
- ✅ Minimal logic - mostly composition
- ✅ Easy to understand data flow

### Feature Folder Structure

```
features/LeadManagement/
├── components/
│   ├── LeadHeader.tsx          # Sub-component: Pure presentation
│   ├── LeadForm.tsx             # Sub-component: Form UI
│   ├── LeadDetails.tsx          # Sub-component: Detail display
│   ├── LeadListItem.tsx         # Sub-component: List item
│   └── index.ts                 # Barrel export
├── hooks/
│   ├── useLeadData.ts           # Fetch lead data
│   ├── useLeadForm.ts           # Form state
│   ├── useLeadActions.ts        # Delete, admin actions
│   ├── useLeadNavigation.ts     # Navigate between leads
│   └── index.ts
├── services/
│   └── LeadService.ts           # API functions (optional)
├── types/
│   └── lead.types.ts
├── utils/
│   └── lead.utils.ts
├── LeadDetailsPage.tsx          # Main orchestrator (50-150 lines)
├── LeadListPage.tsx             # List orchestrator
└── README.md                    # Feature documentation
```

---

## Hook Architecture

### Custom Hook Patterns

#### 1. Data Fetching Hooks

```tsx
// Pattern: Wrapper around useQuery
const useLeadData = (leadId: string | null) => {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiGetLeadById(leadId!),
    enabled: !!leadId,
    // 5 minutes
    retry: (count, error: any) => {
      const status = error?.response?.status;
      // Don't retry 4xx errors
      return !(status >= 400 && status < 500) && count < 2;
    },
  });
};

// Usage
const { data: lead, isLoading, error } = useLeadData(leadId);
```

#### 2. State Management Hooks

```tsx
// Pattern: Manage single concern with clear actions
const useLeadForm = (initialLead?: Lead) => {
  const [formData, setFormData] = useState<Partial<Lead>>(initialLead || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Derived state
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialLead || {}),
    [formData, initialLead]
  );

  // Actions
  const handleChange = useCallback(
    (field: string, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setTouched((prev) => ({ ...prev, [field]: true }));
      // Validate on change if touched
      if (touched[field]) {
        validateField(field, value);
      }
    },
    [touched]
  );

  const validateField = useCallback((field: string, value: any) => {
    // Validation logic
    const fieldErrors = validateLeadField(field, value);
    setErrors((prev) => ({
      ...prev,
      ...(fieldErrors.length ? { [field]: fieldErrors[0] } : {}),
    }));
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  return {
    // State
    formData,
    errors,
    touched,
    isValid,
    isDirty,
    // Actions
    handleChange,
    handleBlur,
    setFormData,
    reset: () => setFormData(initialLead || {}),
  };
};
```

#### 3. Action/Effect Hooks

```tsx
// Pattern: Encapsulate async operations
const useLeadActions = (leadId: string) => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  const deleteLead = useMutation({
    mutationFn: () => apiDeleteLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      openNotification({
        type: 'success',
        massage: 'Lead deleted successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error.message || 'Failed to delete lead',
      });
    },
  });

  const assignLead = useMutation({
    mutationFn: (agentId: string) => apiAssignLead(leadId, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });

  return {
    delete: deleteLead.mutate,
    isDeleting: deleteLead.isPending,
    assign: assignLead.mutate,
    isAssigning: assignLead.isPending,
  };
};
```

#### 4. Composite Hooks (Orchestrator Hooks)

```tsx
// Pattern: Combine multiple hooks for complex features
const useLeadManagement = (leadId: string) => {
  // Fetch data
  const { data: lead, isLoading } = useLeadData(leadId);

  // Manage form state
  const form = useLeadForm(lead);

  // Handle actions
  const actions = useLeadActions(leadId);

  // Combined return
  return {
    lead,
    isLoading,
    form,
    actions,
  };
};

// Usage: Single hook provides all you need
const page = () => {
  const { lead, form, actions } = useLeadManagement(leadId);
  // ...
};
```

### Hook Design Principles

1. **Single Concern**: Each hook manages ONE responsibility
2. **Clear Naming**: `use[Domain][Concern]`
3. **Organized Returns**: Group by category (state, handlers, computed)
4. **Memoization**: Use useMemo/useCallback to optimize
5. **Dependency Management**: Keep dependency arrays tight
6. **Error Handling**: Graceful error states

---

## Service Layer

### Service Design Pattern

```tsx
// 1. Define request/response interfaces
export interface LeadFilters {
  search?: string;
  status?: string;
  assignedAgent?: string;
  page?: number;
  limit?: number;
}

export interface CreateLeadRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface GetLeadsResponse {
  data: Lead[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// 2. Define pure API functions
export async function apiGetLeads(filters: LeadFilters = {}): Promise<GetLeadsResponse> {
  return ApiService.fetchDataWithAxios<GetLeadsResponse>({
    url: '/leads',
    method: 'get',
    params: filters,
    timeout: 5000,
  });
}

export async function apiGetLeadById(leadId: string): Promise<Lead> {
  return ApiService.fetchDataWithAxios<Lead>({
    url: `/leads/${leadId}`,
    method: 'get',
  });
}

export async function apiCreateLead(data: CreateLeadRequest): Promise<Lead> {
  return ApiService.fetchDataWithAxios<Lead>({
    url: '/leads',
    method: 'post',
    data,
  });
}

export async function apiUpdateLead(leadId: string, data: Partial<Lead>): Promise<Lead> {
  return ApiService.fetchDataWithAxios<Lead>({
    url: `/leads/${leadId}`,
    method: 'patch',
    data,
  });
}

export async function apiDeleteLead(leadId: string): Promise<void> {
  return ApiService.fetchDataWithAxios<void>({
    url: `/leads/${leadId}`,
    method: 'delete',
  });
}

// 3. Wrap with React Query in hooks
export const useLeadsQuery = (filters: LeadFilters) => {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => apiGetLeads(filters),
  });
};

export const useCreateLeadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiCreateLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};
```

### Service Naming Conventions

```tsx
// Pattern: api[Action][Entity]

// ✅ GOOD examples:
apiGetLeads(); // GET /leads
apiGetLeadById(id); // GET /leads/:id
apiCreateLead(data); // POST /leads
apiUpdateLead(id, data); // PATCH /leads/:id
apiDeleteLead(id); // DELETE /leads/:id
apiAssignLeadToAgent(leadId); // POST /leads/:id/assign
apiGenerateLeadReport(); // POST /leads/report/generate
apiExportLeads(filters); // POST /leads/export

// ❌ BAD examples:
fetchData(); // Vague
postRequest(); // Generic
updateThing(); // Unclear
handleLead(); // Not a data operation
```

---

## State Management

### Zustand Stores (Local Client State)

**Pattern:** Focused stores with a single responsibility

```tsx
// Store 1: Table zoom level
export const useTableZoomStore = create<{
  zoom: number;
  setZoom: (level: number) => void;
}>((set) => ({
  zoom: 1,
  setZoom: (level) => set({ zoom: Math.max(0.5, Math.min(2, level)) }),
}));

// Store 2: Selected items
export const useSelectedItemsStore = create<{
  selectedIds: string[];
  addSelected: (id: string) => void;
  removeSelected: (id: string) => void;
  clearSelection: () => void;
}>((set) => ({
  selectedIds: [],
  addSelected: (id) =>
    set((state) => ({
      selectedIds: [...state.selectedIds, id],
    })),
  removeSelected: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.filter((x) => x !== id),
    })),
  clearSelection: () => set({ selectedIds: [] }),
}));

// Store 3: Page info
export const usePageInfoStore = create<{
  title: string;
  subtitle: string;
  total: number;
  setPageInfo: (info: Partial<PageInfo>) => void;
  clearPageInfo: () => void;
}>((set) => ({
  title: '',
  subtitle: '',
  total: 0,
  setPageInfo: (info) => set(info),
  clearPageInfo: () => set({ title: '', subtitle: '', total: 0 }),
}));

// Usage: Use selectors to prevent unnecessary re-renders
const title = usePageInfoStore((state) => state.title);
const setPageInfo = usePageInfoStore((state) => state.setPageInfo);
```

### React Query for Server Data

**Pattern:** Centralized, cacheable server state

```tsx
// Define query keys for consistency
const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
  activities: (id: string) => [...leadKeys.detail(id), 'activities'] as const,
};

// Queries
const { data: leads } = useQuery({
  queryKey: leadKeys.list(filters),
  queryFn: () => apiGetLeads(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const { data: lead } = useQuery({
  queryKey: leadKeys.detail(leadId),
  queryFn: () => apiGetLeadById(leadId),
  enabled: !!leadId,
});

// Mutations with cache invalidation
const createMutation = useMutation({
  mutationFn: apiCreateLead,
  onSuccess: (newLead) => {
    // Invalidate lists
    queryClient.invalidateQueries({
      queryKey: leadKeys.lists(),
    });
    // Add to detail cache
    queryClient.setQueryData(leadKeys.detail(newLead._id), newLead);
  },
});
```

---

## Real-World Examples

### Example 1: Lead Details Page (Refactored)

**Before (Monolithic - 745 lines):**

```tsx
// ❌ BAD: Everything in one component
const LeadDetails = ({ leadId }) => {
  const [lead, setLead] = useState(null);
  const [form, setForm] = useState({});
  const [offers, setOffers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  // ... 20+ state variables

  useEffect(() => {
    /* fetch lead */
  }, [leadId]);
  useEffect(() => {
    /* fetch offers */
  }, [leadId]);
  useEffect(() => {
    /* fetch notes */
  }, [leadId]);
  // ... many more effects

  const handleFormChange = () => {
    /* logic */
  };
  const handleSave = () => {
    /* logic */
  };
  const handleDelete = () => {
    /* logic */
  };
  // ... many more handlers

  return <div>{/* 300+ lines of JSX */}</div>;
};
```

**After (Modular - 158 lines):**

```tsx
// ✅ GOOD: Orchestrator component
export const LeadDetails = ({ leadId }: { leadId: string }) => {
  const { lead, isLoading } = useLeadData(leadId);
  const { formData, handlers } = useLeadForm(lead);
  const { actions } = useLeadActions(leadId);
  const { nextLead, previousLead } = useLeadNavigation(leadId);

  if (isLoading) return <LoadingSpinner />;
  if (!lead) return <NotFound />;

  return (
    <div className="space-y-4">
      <LeadHeader
        lead={lead}
        onNext={nextLead}
        onPrevious={previousLead}
        onDelete={actions.delete}
      />
      <LeadEditForm lead={lead} onChange={handlers.handleChange} onSubmit={handlers.handleSubmit} />
      <OfferForm leadId={leadId} />
      <ReclamationForm leadId={leadId} />
      <LeadDetails lead={lead} />
    </div>
  );
};

// Hook 1: Fetch lead data
const useLeadData = (leadId: string) => {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiGetLeadById(leadId),
    enabled: !!leadId,
  });
};

// Hook 2: Form state
const useLeadForm = (lead?: Lead) => {
  const [formData, setFormData] = useState<Partial<Lead>>(lead || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await apiUpdateLead(lead!._id, formData);
    } catch (error) {
      // Handle error
    }
  }, [formData, lead]);

  return { formData, errors, handlers: { handleChange, handleSubmit } };
};

// Hook 3: Actions
const useLeadActions = (leadId: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    mutationFn: () => apiDeleteLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigate('/leads');
    },
  });

  return {
    actions: {
      delete: deleteMutation.mutate,
    },
  };
};

// Hook 4: Navigation
const useLeadNavigation = (currentLeadId: string) => {
  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: apiGetLeads,
  });

  const currentIndex = leads?.findIndex((l) => l._id === currentLeadId) ?? -1;

  return {
    nextLead: currentIndex < (leads?.length ?? 0) - 1 ? leads?.[currentIndex + 1] : null,
    previousLead: currentIndex > 0 ? leads?.[currentIndex - 1] : null,
  };
};
```

---

## Refactoring Checklist

Use this checklist when refactoring components:

### Component Size

- [ ] Component is under 300 lines
- [ ] Component has a single clear purpose
- [ ] Extractable sub-components identified and created

### Responsibility Separation

- [ ] UI rendering logic separate from business logic
- [ ] Data fetching in hooks, not component
- [ ] State management in stores/hooks, not component
- [ ] API calls in services, not components

### State Management

- [ ] Using React Query for server data
- [ ] Using Zustand for local state (if needed)
- [ ] No prop drilling (max 2 levels)
- [ ] Appropriate use of Context where needed

### Typing & Validation

- [ ] All props have explicit types
- [ ] No `any` types used
- [ ] Request/response interfaces defined
- [ ] Error types handled

### Hook Architecture

- [ ] Each hook has one responsibility
- [ ] Hook names follow `use[Domain][Concern]` pattern
- [ ] Return values organized (state, handlers, computed)
- [ ] Dependencies correctly specified

### Service Layer

- [ ] API functions named `api[Action][Entity]`
- [ ] All API calls use `ApiService`
- [ ] Interfaces for requests and responses
- [ ] Error handling included

### Performance

- [ ] useMemo used for expensive computations
- [ ] useCallback used for stable handler references
- [ ] No unnecessary re-renders
- [ ] Query/mutation options optimized (staleTime, retry, etc)

### Testing Readiness

- [ ] Components can be rendered with mock props
- [ ] Hooks can be tested independently
- [ ] Services are pure functions
- [ ] No tight coupling between layers

---

## Migration Path

### Step 1: Audit Current Code

- Identify monolithic components (>300 lines)
- List responsibilities per component
- Map data flow

### Step 2: Extract Hooks

- Move state to custom hooks
- Create data-fetching hooks
- Create action/effect hooks

### Step 3: Refactor Components

- Keep component for orchestration only
- Move presentation to sub-components
- Use hooks for logic

### Step 4: Organize Services

- Group API calls by domain
- Create typed request/response interfaces
- Add React Query wrappers

### Step 5: Verify & Test

- Check component size
- Verify responsibilities
- Test integration
- Performance check

---

## References

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [React Hooks Documentation](https://react.dev/reference/react)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Clean Code Principles](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
