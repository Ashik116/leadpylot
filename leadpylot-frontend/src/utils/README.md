# Dynamic Metadata System - Refactored

## What Changed

The system has been **simplified** to be much easier to use and maintain.

## Before vs After

### ❌ Before (Complex)
- Multiple complex functions
- Dynamic route patterns with generators
- Complex metadata generation
- Hard to understand and modify

### ✅ After (Simple)
- Single route mapping object
- Simple regex checks for dynamic routes
- Clean, readable code
- Easy to add new routes

## How to Add New Routes

Just add to the `routeTitles` object in `dynamicMetadata.ts`:

```ts
const routeTitles: Record<string, string> = {
  // ... existing routes
  
  // Add your new route here
  '/dashboards/new-feature': 'New Feature',
  '/admin/new-page': 'New Admin Page',
};
```

## How to Add Dynamic Routes

Add a simple regex check in the `getPageTitle` function:

```ts
// Handle dynamic routes
if (cleanPath.match(/^\/dashboards\/leads\/[^\/]+$/)) {
  return 'Lead Details';
}

// Add your new dynamic route here
if (cleanPath.match(/^\/dashboards\/new-feature\/[^\/]+$/)) {
  return 'Feature Details';
}
```

## Usage Examples

### 1. Get Page Title
```tsx
import { usePageTitle } from '@/hooks/useDynamicMetadata';

function MyComponent() {
  const title = usePageTitle();
  return <h1>{title}</h1>;
}
```

### 2. Use Page Header
```tsx
import PageHeader from '@/components/shared/PageHeader';

function MyPage() {
  return (
    <div>
      <PageHeader />
      {/* Your content */}
    </div>
  );
}
```

## Benefits of Refactor

- 🚀 **Faster**: Simpler code = better performance
- 🧹 **Cleaner**: Easy to read and understand
- 🔧 **Maintainable**: Simple to modify and extend
- 📚 **Learnable**: New developers can understand it quickly
- 🐛 **Debuggable**: Fewer moving parts = easier to debug

## Files

- `dynamicMetadata.ts` - Core route mapping
- `useDynamicMetadata.ts` - React hooks
- `DynamicMetadata.tsx` - Title updater component
- `PageHeader.tsx` - Page header component

That's it! Simple and effective. 🎯
