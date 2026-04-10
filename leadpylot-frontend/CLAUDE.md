# LeadPylot Frontend - Claude AI Coding Guide

This guide outlines the architecture, patterns, and conventions for the LeadPylot frontend codebase.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **React**: Version 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand (client) + TanStack Query (server)
- **HTTP Client**: Axios

---

## Architecture Principles

### Core Philosophy

> **Keep it Simple, Clean, and Modular**

1. **Clean Architecture**: Separate concerns - UI, business logic, and data layers
2. **Modular Components**: Build small, focused components that do one thing well
3. **Reusability First**: Extract reusable patterns before duplicating code
4. **No Over-Engineering**: Don't build abstractions for "what if" scenarios
5. **Design System Consistency**: Follow existing UI patterns and components

---

## Project Structure

```
src/
├── app/                    # Next.js App Router (routes + layouts)
├── components/
│   ├── ui/                 # Reusable UI components (Button, Input, etc.)
│   ├── shared/             # Business logic components (DataTable, Forms)
│   ├── template/           # Layout providers and wrappers
│   └── layouts/            # Page-specific layouts
├── hooks/                  # Custom React hooks
├── services/               # API service layer
├── stores/                 # Zustand state stores
├── utils/                  # Helper functions
├── configs/                # Configuration files
└── types/                  # TypeScript type definitions
```

---

## Component Guidelines

### 1. Use Reusable Components First

Before creating new components, check `src/components/ui/` for existing ones.

**Available UI Components:**

- `Button` - Primary, secondary, tertiary variants
- `Input` - Text, number, email with validation
- `Select` / `AsyncSelect` - Single/multi selection
- `Checkbox` / `Radio` - Form inputs
- `Modal` - Dialog overlays
- `Tooltip` - Hover tooltips
- `Badge` - Status indicators
- `DataTableOptimized` - Sortable, filterable tables

### 2. Component Structure Pattern

```tsx
// ✅ Good - Simple, focused component
interface UserCardProps {
  user: User;
  onEdit?: (id: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">{user.name}</h3>
      <p className="text-sm text-gray-500">{user.email}</p>
      {onEdit && (
        <Button size="sm" onClick={() => onEdit(user.id)}>
          Edit
        </Button>
      )}
    </div>
  );
}
```

### 3. Keep Components Small

- Aim for **< 200 lines** per component
- Extract sub-components when complexity grows
- Use composition over props drilling

```tsx
// ❌ Bad - Too much in one component
export function ComplexPage() {
  // 300+ lines of mixed concerns...
}

// ✅ Good - Composed of smaller pieces
export function ComplexPage() {
  return (
    <PageLayout>
      <FilterSection />
      <DataTableOptimized />
      <PaginationBar />
    </PageLayout>
  );
}
```

### 4. Client vs Server Components

- **Default to Server Components** for better performance
- Use **"use client"** only when needed (interactivity, hooks, browser APIs)

```tsx
// Server Component (default)
export async function UserListPage() {
  const users = await fetchUsers(); // Server-side fetch
  return <UserGrid users={users} />;
}

// Client Component (when needed)
('use client');
export function UserTable({ users }: { users: User[] }) {
  const [sort, setSort] = useState('name');
  // Interactive state...
}
```

---

## State Management Guidelines

### 1. Use Zustand for Client State

```typescript
// src/stores/useAuthStore.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    const user = await AuthService.login(credentials);
    set({ user, isAuthenticated: true });
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

### 2. Use TanStack Query for Server State

```typescript
// Automatic caching, refetching, loading states
const { data, isLoading, error } = useQuery({
  queryKey: ['users', page],
  queryFn: () => UserService.getUsers(page),
});
```

### 3. Keep State Local When Possible

```tsx
// ❌ Don't put everything in global state
const [isOpen, setIsOpen] = useState(false); // ✅ This is fine

// Only globalize if:
// - Multiple components need it
// - It needs to persist across navigation
// - It's server data that needs caching
```

---

## API Service Layer

### Service Pattern

```typescript
// src/services/UserService.ts
import api from './api';

export const UserService = {
  async getUsers(page = 1) {
    const { data } = await api.get('/users', { params: { page } });
    return data;
  },

  async getUserById(id: string) {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  async createUser(user: CreateUserDto) {
    const { data } = await api.post('/users', user);
    return data;
  },
};
```

---

## Styling Guidelines

### 1. Use Tailwind Utility Classes

```tsx
// ✅ Preferred
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">

// ❌ Avoid inline styles
<div style={{ display: "flex", gap: "16px", padding: "16px" }}>
```

### 2. Follow Design System

- **Colors**: Use existing color tokens (primary, success, warning, danger)
- **Spacing**: Use Tailwind's scale (1, 2, 3, 4, 6, 8...)
- **Typography**: Use text variants (text-sm, text-base, text-lg, font-medium, font-semibold)
- **Borders**: Use rounded variants (rounded, rounded-md, rounded-lg)

### 3. Responsive Design

```tsx
// Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## Custom Hooks

### Extract Reusable Logic

```typescript
// src/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

### Hook Naming Convention

- Always prefix with `use`
- Name should describe what it does: `useAuth`, `useFilterChainLeads`, `usePagination`

---

## TypeScript Best Practices

### 1. Type Imports

```typescript
// ✅ Use type imports for types only
import type { User, CreateUserDto } from './types';

// ❌ Avoid
import { User, CreateUserDto } from './types';
```

### 2. Avoid `any`

```typescript
// ❌ Bad
function processData(data: any) {}

// ✅ Good - Define the type
interface ProcessedData {
  id: string;
  status: 'pending' | 'complete';
}
function processData(data: ProcessedData) {}
```

### 3. Use Utility Types

```typescript
// For forms - make all fields optional
type UserForm = Partial<Omit<User, 'id'>>;

// For API responses
type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};
```

---

## File Naming Conventions

| Type       | Pattern        | Example                  |
| ---------- | -------------- | ------------------------ |
| Components | PascalCase.tsx | `UserCard.tsx`           |
| Hooks      | use\*.ts       | `useAuth.ts`             |
| Services   | \*Service.ts   | `UserService.ts`         |
| Stores     | use\*Store.ts  | `useAuthStore.ts`        |
| Utils      | camelCase.ts   | `dateUtils.ts`           |
| Types      | \*.types.ts    | `user.types.ts`          |
| API Routes | route.ts       | `app/api/users/route.ts` |

---

## Common Patterns to Follow

### 1. DataTable with Filtering

```tsx
export function LeadsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: LeadService.getLeads,
  });

  return <DataTable data={data?.leads || []} columns={leadColumns} searchable filterable />;
}
```

### 2. Form Handling

```tsx
export function UserForm() {
  const [formData, setFormData] = useState<UserFormData>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await UserService.createUser(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Name"
        value={formData.name || ''}
        onChange={(val) => setFormData({ ...formData, name: val })}
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### 3. Loading & Error States

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: UserService.getUsers,
});

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <UserList users={data} />;
```

---

## What NOT to Do

### ❌ Anti-Patterns

1. **Don't over-abstract** - Don't create "universal" components for one-off use cases
2. **Don't prop-drill** - Use context or composition for deeply nested props
3. **Don't inline large objects** - Extract to constants or components
4. **Don't mix concerns** - Keep UI separate from business logic
5. **Don't ignore TypeScript** - Use types, don't use `any`
6. **Don't create redundant utils** - Use existing helpers before creating new ones

### Example of Over-Engineering (Avoid This)

```tsx
// ❌ Bad - Over-abstracted
interface AbstractButtonConfig {
  variant: ButtonVariant;
  size: ButtonSize;
  loading: boolean;
  disabled: boolean;
  icon?: IconConfig;
  tooltip?: TooltipConfig;
  // ...20 more props
}

// ✅ Good - Simple and focused
<Button variant="primary" size="md" loading={isLoading}>
  Submit
</Button>;
```

---

## Before Writing Code

1. **Check for existing components** in `src/components/ui/`
2. **Check for existing services** in `src/services/`
3. **Check for existing hooks** in `src/hooks/`
4. **Check for existing utilities** in `src/utils/`
5. **Follow the patterns** established in similar features

---

## Summary

| Principle                   | Action                                             |
| --------------------------- | -------------------------------------------------- |
| **Reuse First**             | Check existing components before creating new ones |
| **Keep It Small**           | Components < 200 lines, extract when larger        |
| **Compose Over Prop-Drill** | Build complex UIs from simple pieces               |
| **Type Everything**         | No `any`, use proper TypeScript types              |
| **Server by Default**       | Use Server Components unless client needed         |
| **Design System**           | Follow Tailwind patterns and existing UI           |
| **No Over-Engineering**     | Solve current problem, not hypothetical ones       |
