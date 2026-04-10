# LeadDetails Components

This directory contains a refactored, modular lead details management system that was previously contained in a single 745-line component. The refactoring provides better maintainability, testability, and reusability.

## Architecture Overview

### 🎯 Main Component
- **`LeadDetails.tsx`** - Main orchestrator component (reduced from 745 to 158 lines - 79% reduction)

### 🎣 Custom Hooks
- **`useLeadForm`** - Manages lead editing state and validation
- **`useOfferForm`** - Handles offer creation form logic
- **`useReclamation`** - Manages reclamation submission
- **`useLeadNavigation`** - Handles navigation between leads
- **`useLeadActions`** - Manages delete and admin actions

### 🧩 Sub-Components
- **`LeadHeader`** - Header with navigation and action buttons
- **`LeadEditForm`** - Lead editing form with validation
- **`OfferForm`** - Offer creation form with data fetching
- **`ReclamationForm`** - Reclamation submission form

## Key Benefits

✅ **Massive Size Reduction**: Main component reduced from 745 lines to 158 lines (79% reduction)  
✅ **Single Responsibility**: Each hook and component has one clear purpose  
✅ **Better State Management**: Centralized section toggle logic prevents conflicts  
✅ **Reusability**: Components can be used independently  
✅ **Testability**: Smaller units are easier to unit test  
✅ **Type Safety**: Well-defined interfaces and proper TypeScript usage  
✅ **Clean Architecture**: Clear separation between UI, state management, and business logic  

## Usage Examples

### Basic Usage
```tsx
import { LeadDetails } from './LeadDetails';

<LeadDetails
  lead={leadData}
  isAddOpeningOpen={isOpen}
  setIsAddOpeningOpen={setIsOpen}
/>
```

### Using Individual Hooks
```tsx
import { useLeadForm, useLeadNavigation } from './LeadDetails/';

function CustomLeadInterface({ lead }) {
  const leadForm = useLeadForm({ lead });
  const navigation = useLeadNavigation();
  
  // Build your own UI using the hook data and functions
  return (/* custom UI */);
}
```

### Using Individual Components
```tsx
import { LeadHeader, LeadEditForm } from './LeadDetails/';

// Use components independently
<div>
  <LeadHeader {...headerProps} />
  <LeadEditForm {...formProps} />
</div>
```

## Hook APIs

### useLeadForm
```tsx
interface UseLeadFormProps {
  lead: TLead;
}

Returns: {
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  control: any;
  handleSubmit: () => void;
  errors: any;
  isUpdatingLead: boolean;
  handleEditClick: () => void;
  cancelEdit: () => void;
}
```

### useOfferForm
```tsx
interface UseOfferFormProps {
  projectId: string;
  leadId: string;
  agentId: string;
}

Returns: {
  isAddOfferOpen: boolean;
  setIsAddOfferOpen: (open: boolean) => void;
  control: any;
  handleSubmit: () => void;
  errors: any;
  isSubmitting: boolean;
  handleAddOfferClick: () => void;
  cancelOffer: () => void;
}
```

### useReclamation
```tsx
interface UseReclamationProps {
  leadId: string;
  projectId?: string;
  agentId?: string;
}

Returns: {
  isReclamationOpen: boolean;
  setIsReclamationOpen: (open: boolean) => void;
  isSubmittingReclamation: boolean;
  reclamationReason: string;
  setReclamationReason: (reason: string) => void;
  handleReclamationClick: () => void;
  handleReclamationSubmit: () => Promise<void>;
  cancelReclamation: () => void;
}
```

### useLeadNavigation
```tsx
Returns: {
  currentPosition: number;
  totalUsers: number;
  goToPreviousUser: () => void;
  goToNextUser: () => void;
  handleMeetingClick: (leadId: string, leadName: string) => void;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
}
```

### useLeadActions
```tsx
interface UseLeadActionsProps {
  leadId: string;
}

Returns: {
  isAdmin: boolean;
  isDeleteDialogOpen: boolean;
  uploadedFiles: Array<{ file: File; type: any }>;
  setUploadedFiles: (files: Array<{ file: File; type: any }>) => void;
  isDeletingLead: boolean;
  handleDelete: () => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
}
```

## Component Props

### LeadHeader
```tsx
interface LeadHeaderProps {
  currentPosition: number;
  totalUsers: number;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
  isAdmin: boolean;
  isEditing: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
```

### LeadEditForm
```tsx
interface LeadEditFormProps {
  control: any;
  errors: any;
  isUpdatingLead: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}
```

### OfferForm
```tsx
interface OfferFormProps {
  control: any;
  errors: any;
  isSubmitting: boolean;
  projectId: string;
  onSubmit: () => void;
  onCancel: () => void;
}
```

### ReclamationForm
```tsx
interface ReclamationFormProps {
  reclamationReason: string;
  isSubmitting: boolean;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}
```

## File Structure
```
LeadDetails/
├── LeadDetails.tsx                # Main component (158 lines)
├── hooks/
│   ├── useLeadForm.tsx           # Lead editing logic
│   ├── useOfferForm.tsx          # Offer creation logic
│   ├── useReclamation.tsx        # Reclamation logic
│   ├── useLeadNavigation.tsx     # Navigation logic
│   └── useLeadActions.tsx        # Delete/admin actions
├── components/
│   ├── LeadHeader.tsx            # Header component
│   ├── LeadEditForm.tsx          # Edit form component
│   ├── OfferForm.tsx             # Offer form component
│   └── ReclamationForm.tsx       # Reclamation form
├── index.ts                      # Exports
└── README.md                     # This file
```

## State Management Improvements

### Section Toggle Logic
The refactored component includes intelligent section management:
- Only one section (edit/offer/reclamation/opening) can be open at a time
- Opening a new section automatically closes others
- Prevents UI conflicts and confusion

### Conditional Hook Initialization
```tsx
// Only initialize hooks when data is available
const offerForm = projectId && agentId 
  ? useOfferForm({ projectId, leadId: leadId.toString(), agentId })
  : null;
```

## Migration Guide

The new component maintains the same external API:

```tsx
// ✅ No changes needed - same API
<LeadDetails
  lead={lead}
  isAddOpeningOpen={isAddOpeningOpen}
  setIsAddOpeningOpen={setIsAddOpeningOpen}
/>
```

For advanced usage, you can now import individual hooks and components:

```tsx
// ✅ New possibilities
import { useLeadForm, LeadHeader } from './LeadDetails/';
```

## Performance Improvements

- **Code Splitting**: Components can be lazy-loaded independently
- **Bundle Size**: Smaller components mean better tree-shaking
- **Re-render Optimization**: Isolated state prevents unnecessary re-renders
- **Hook Reusability**: Logic can be shared across different implementations
- **Better Memoization**: Smaller components are easier to optimize

## Validation & Error Handling

- **Centralized Schemas**: Zod validation schemas in dedicated hooks
- **Form Validation**: React Hook Form integration with proper error handling
- **API Error Handling**: Comprehensive error handling in all hooks
- **User Feedback**: Proper toast notifications for all actions

This refactoring maintains 100% backward compatibility while providing a much cleaner, more maintainable codebase that follows modern React best practices. 