# AssignmentDoubleClickModal Component

A reusable singleton component that provides double-click functionality to open lead assignment modals from any table cell.

## Features

- ✅ **Singleton Pattern** - Single modal instance across the entire app
- ✅ **Reusable** - Can be used in any table (leads, offers, etc.)
- ✅ **Zustand-based** - Uses Zustand for global state management
- ✅ **No Provider Wrapping** - Works globally without wrapping pages
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Easy Integration** - Simple wrapper component for table cells

## Usage

### 1. No Provider Wrapping Needed! 🎉

The modal is automatically available globally in all protected pages. No need to wrap individual pages with providers.

### 2. Use AssignmentCell in your table columns

```tsx
import { AssignmentCell } from '@/components/shared/AssignmentDoubleClickModal';

// In your column definition
{
  id: 'agent',
  header: 'Agent',
  cell: (props: any) => {
    const lead = props.row.original;
    const agentName = lead?.project?.[0]?.agent?.login;

    return (
      <AssignmentCell lead={lead}>
        <AgentBatch agentName={agentName} />
      </AssignmentCell>
    );
  },
},
{
  id: 'project',
  header: 'Project',
  cell: (props: any) => {
    const lead = props.row.original;
    const projectName = lead?.project?.[0]?.name;

    return (
      <AssignmentCell lead={lead}>
        <span>{projectName ?? '-'}</span>
      </AssignmentCell>
    );
  },
}
```

### 3. For Offers Dashboard Example

```tsx
// In your offers table columns
{
  id: 'agent',
  header: 'Agent',
  cell: (props: any) => {
    const offer = props.row.original;
    // Convert offer to lead format if needed
    const lead = {
      _id: offer.leadId,
      project: [{ agent: { login: offer.agent } }],
      // ... other lead properties
    };

    return (
      <AssignmentCell lead={lead}>
        <span>{offer.agent}</span>
      </AssignmentCell>
    );
  },
}
```

## API

### AssignmentCell Props

```tsx
interface AssignmentCellProps {
  lead: Lead; // Lead data
  children: React.ReactNode; // Content to render
  className?: string; // Optional CSS classes
}
```

### useAssignmentModalStore Hook

```tsx
const { openAssignmentModal, closeAssignmentModal, isOpen, selectedLead } =
  useAssignmentModalStore();
```

## Implementation Details

- **Zustand Store**: Manages global state for the assignment modal
- **Global Modal**: Automatically available in all protected pages
- **Single Instance**: Only one modal can be open at a time
- **Automatic Cleanup**: Modal state is reset when closed
- **Event Handling**: Prevents row navigation on double-click
- **Visual Feedback**: Cursor pointer and tooltip on hover
- **Admin Only**: Only admin users can trigger the modal

## Benefits

1. **No Provider Wrapping** - Works globally without wrapping pages
2. **DRY Principle** - No code duplication across tables
3. **Consistent UX** - Same assignment modal everywhere
4. **Easy Maintenance** - Single source of truth for assignment logic
5. **Type Safety** - Full TypeScript support
6. **Performance** - Memoized components and optimized re-renders

## Migration from Old Implementation

The old implementation had assignment logic scattered across multiple files. This new approach:

- ✅ **No Provider Wrapping** - Works globally without wrapping pages
- ✅ **Zustand-based** - Uses Zustand for global state management
- ✅ **Centralized Logic** - Single source of truth for assignment logic
- ✅ **Easy Integration** - Simple to add to new tables
- ✅ **Reduced Duplication** - No code duplication across tables
- ✅ **Better Maintainability** - Easier to maintain and update
