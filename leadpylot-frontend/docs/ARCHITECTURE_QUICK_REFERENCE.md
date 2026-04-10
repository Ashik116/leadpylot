# Frontend Architecture - Quick Reference Card

## 🏗️ 4-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER - React Components                       │
│ • UI rendering only • Props-driven • No data fetching       │
│ • Delegated logic • Minimal state • Composition-based       │
└─────────────────────────────────────────────────────────────┘
                            ↑ imports
┌─────────────────────────────────────────────────────────────┐
│ BUSINESS LOGIC LAYER - Hooks & Stores                       │
│ • State management (useState, Zustand)                      │
│ • Form validation • Data transformation                     │
│ • Effect orchestration • Calls services                     │
└─────────────────────────────────────────────────────────────┘
                            ↑ imports
┌─────────────────────────────────────────────────────────────┐
│ DATA ACCESS LAYER - Services & React Query                  │
│ • API calls via ApiService • Typed requests/responses       │
│ • Query keys & mutations • Cache management                 │
│ • Error handling & transformation                           │
└─────────────────────────────────────────────────────────────┘
                            ↑ uses
┌─────────────────────────────────────────────────────────────┐
│ EXTERNAL LAYER - Backend APIs & Databases                   │
│ • REST endpoints • Third-party services                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 SOLID Principles Cheat Sheet

### SRP - Single Responsibility

```
✅ GOOD: One hook = one concern
const useLeadForm = () => { /* form state */ };
const useLeadData = () => { /* data fetching */ };
const useLeadActions = () => { /* delete/assign */ };

❌ BAD: Multiple concerns in one hook
const useLeadPage = () => { /* 20+ responsibilities */ };
```

### OCP - Open/Closed

```
✅ GOOD: Extensible through config
<StatusBadge status="active" config={customConfig} />

❌ BAD: Hardcoded logic requiring modification
const LeadStatus = ({ status }) => {
  if (status === 'x') return ...;
  if (status === 'y') return ...;  // Add new? Modify!
};
```

### LSP - Liskov Substitution

```
✅ GOOD: Consistent interface
interface ILeadService {
  getLeads(...): Promise<Lead[]>;
}

// Both implementations satisfy interface
const LeadService: ILeadService = { ... };
const MockLeadService: ILeadService = { ... };
```

### ISP - Interface Segregation

```
✅ GOOD: Specific interfaces
interface BaseTableProps { data: T[]; columns: ColumnDef<T>[]; }
interface SelectableTableProps { selectable: boolean; onSelect: (...) => void; }
interface PaginatedTableProps { pageIndex: number; pageSize: number; }

❌ BAD: Monolithic interface
interface TableProps { /* 30+ properties */ }
```

### DIP - Dependency Inversion

```
✅ GOOD: Depend on abstraction
const MyComponent = ({ service: ILeadService }) => { ... };

❌ BAD: Direct concrete dependency
const MyComponent = () => {
  const service = LeadsService; // Tight coupling
};
```

---

## 🧩 Component Types

### Presentational (Pure)

```typescript
interface LeadCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onSelect }) => (
  <div onClick={() => onSelect(lead)}>
    {lead.email}
  </div>
);
```

### Container (Smart)

```typescript
export const LeadCardContainer = () => {
  const { data: lead } = useLeadData();
  return <LeadCard lead={lead} onSelect={handleSelect} />;
};
```

### Orchestrator (Feature)

```typescript
export const LeadPage = ({ leadId }: { leadId: string }) => {
  const { data: lead } = useLeadData(leadId);
  const { form, handlers } = useLeadForm(lead);
  const { actions } = useLeadActions(leadId);

  return (
    <div>
      <LeadHeader lead={lead} onDelete={actions.delete} />
      <LeadForm data={form} onChange={handlers.change} />
    </div>
  );
};
```

---

## 🎣 Hook Patterns

### Data Fetching Hook

```typescript
const useLeadData = (leadId: string) => {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiGetLeadById(leadId),
    enabled: !!leadId,
  });
};
```

### State Management Hook

```typescript
const useLeadForm = (initialLead?: Lead) => {
  const [formData, setFormData] = useState<Partial<Lead>>(initialLead || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  return {
    // State
    formData,
    errors,
    // Actions
    handleChange: (field, value) => {
      /* ... */
    },
    handleSubmit: async () => {
      /* ... */
    },
  };
};
```

### Action Hook

```typescript
const useLeadActions = (leadId: string) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => apiDeleteLead(leadId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  return { delete: deleteMutation.mutate, isDeleting: deleteMutation.isPending };
};
```

### Composite Hook

```typescript
const useLeadManagement = (leadId: string) => {
  const { data: lead } = useLeadData(leadId);
  const form = useLeadForm(lead);
  const actions = useLeadActions(leadId);
  return { lead, form, actions };
};
```

---

## 🔌 Service Layer

### Naming Convention: `api[Action][Entity]`

```typescript
// ✅ GOOD
apiGetLeads(filters); // GET /leads
apiGetLeadById(id); // GET /leads/:id
apiCreateLead(data); // POST /leads
apiUpdateLead(id, data); // PATCH /leads/:id
apiDeleteLead(id); // DELETE /leads/:id
apiAssignLeadToAgent(leadId, agentId); // POST /leads/:id/assign
apiGenerateLeadReport(filters); // POST /leads/report

// ❌ BAD
fetchData();
postRequest();
updateThing();
handleLead();
```

### Service Pattern

```typescript
// 1. Define interfaces
export interface LeadFilters {
  search?: string;
}
export interface CreateLeadRequest {
  email: string;
}

// 2. Pure API functions
export async function apiGetLeads(filters: LeadFilters) {
  return ApiService.fetchDataWithAxios<Lead[]>({
    url: '/leads',
    method: 'get',
    params: filters,
  });
}

// 3. React Query wrapper (optional)
export const useLeadsQuery = (filters: LeadFilters) =>
  useQuery({ queryKey: ['leads', filters], queryFn: () => apiGetLeads(filters) });
```

---

## 💾 State Management

### Zustand - Local Client State

```typescript
// Single concern per store
export const useTableZoomStore = create((set) => ({
  zoom: 1,
  setZoom: (level: number) => set({ zoom: level }),
}));

// Usage with selector (prevents unnecessary re-renders)
const zoom = useTableZoomStore((state) => state.zoom);
```

### React Query - Server State

```typescript
// Define consistent query keys
const leadKeys = {
  all: ['leads'],
  lists: () => [...leadKeys.all, 'list'],
  list: (filters) => [...leadKeys.lists(), filters],
  details: () => [...leadKeys.all, 'detail'],
  detail: (id) => [...leadKeys.details(), id],
};

// Use in queries
const { data: leads } = useQuery({
  queryKey: leadKeys.list(filters),
  queryFn: () => apiGetLeads(filters),
});
```

---

## 📐 Code Size Guidelines

| Component Type           | Target Size    |
| ------------------------ | -------------- |
| Presentational Component | 50-100 lines   |
| Container Component      | 100-200 lines  |
| Orchestrator Component   | 50-150 lines   |
| Custom Hook              | 50-150 lines   |
| Service File             | 100-300 lines  |
| Entire Feature Folder    | 500-1000 lines |

---

## ✅ Checklist - Before Committing

- [ ] Component <300 lines (split if larger)
- [ ] All props have explicit types (no `any`)
- [ ] SRP: One responsibility per module
- [ ] No prop drilling (max 2 levels)
- [ ] Services named `api[Action][Entity]`
- [ ] Hooks named `use[Domain][Concern]`
- [ ] React Query for server data
- [ ] Zustand for local state
- [ ] Error handling in async operations
- [ ] useMemo/useCallback used appropriately
- [ ] Dependencies correctly specified

---

## 🚀 Refactoring Template

```typescript
// BEFORE: Monolithic component (745 lines)
const LeadDetails = ({ leadId }) => {
  const [lead, setLead] = useState(null);
  const [form, setForm] = useState({});
  // ... 20+ state variables
  useEffect(() => { /* ... */ }, []);
  // ... 5+ more effects
  return <div>{/* 300+ lines JSX */}</div>;
};

// AFTER: Clean separation
// 1. Extract hooks
const useLeadData = (leadId) => useQuery({ ... });
const useLeadForm = (lead) => { /* state & handlers */ };
const useLeadActions = (leadId) => { /* mutations */ };

// 2. Create sub-components
const LeadHeader = ({ lead, onDelete }) => <div>...</div>;
const LeadForm = ({ data, onChange }) => <div>...</div>;

// 3. Orchestrator component (158 lines)
const LeadDetails = ({ leadId }) => {
  const { data: lead } = useLeadData(leadId);
  const form = useLeadForm(lead);
  const actions = useLeadActions(leadId);

  return (
    <div>
      <LeadHeader lead={lead} onDelete={actions.delete} />
      <LeadForm data={form.data} onChange={form.handleChange} />
    </div>
  );
};
```

---

## 📁 Folder Structure Template

```
features/[FeatureName]/
├── components/
│   ├── [ComponentName].tsx      # Presentational
│   ├── [ItemName].tsx           # Presentational
│   └── index.ts                 # Barrel export
├── hooks/
│   ├── use[Feature]Data.ts      # Data fetching
│   ├── use[Feature]Form.ts      # Form state
│   ├── use[Feature]Actions.ts   # Mutations
│   └── index.ts                 # Barrel export
├── services/
│   └── [Feature]Service.ts      # API functions
├── types/
│   └── [feature].types.ts       # Type definitions
├── utils/
│   └── [feature].utils.ts       # Utility functions
├── [FeatureWrapper].tsx         # Orchestrator (50-150 lines)
└── README.md                    # Documentation
```

---

## 🔗 Related Documentation

- **Full Rules:** `.cursor/rules/.cursorrules`
- **Comprehensive Guide:** `frontend/CLEAN_ARCHITECTURE_GUIDE.md`
- **Update Summary:** `frontend/ARCHITECTURE_UPDATES_SUMMARY.md`

---

## Key Takeaways

1. **Keep it small:** Components and hooks <300 lines
2. **One job:** SRP - single responsibility
3. **Layer it:** Follow 4-layer architecture
4. **Type it:** No `any` types
5. **Service it:** Pure API functions
6. **Hook it:** Focused custom hooks
7. **Query it:** React Query for server data
8. **Store it:** Zustand for local state
9. **Compose it:** Orchestrator pattern
10. **Document it:** README for complex features

---

**Remember:** Clean code is not about perfection, it's about making the next developer's job easier.
