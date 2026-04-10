# Dynamic File Upload Service & Hooks

This document describes the new unified file upload system that replaces the complex conditional logic in the `handleFileUpload` function.

## Overview

The new system provides:
- **Unified API**: Single service for all file uploads
- **Type Safety**: Full TypeScript support
- **Consistent Error Handling**: Standardized error management
- **Query Invalidation**: Automatic cache invalidation
- **Toast Notifications**: Built-in user feedback

## API Pattern

All uploads follow the pattern: `POST :tablename/:id`

## Service Functions

### `apiUploadFiles(tableName, id, data)`
Main service function for uploading files with multiple document types.

```typescript
import { apiUploadFiles } from '@/services/FileUploadService';

const response = await apiUploadFiles('offers', 'offer-id-123', {
  files: [file1, file2],
  documentTypes: ['contract', 'id']
});
```

### `apiUploadFilesWithSingleType(tableName, id, files, documentType)`
Simplified function for single document type uploads.

```typescript
import { apiUploadFilesWithSingleType } from '@/services/FileUploadService';

const response = await apiUploadFilesWithSingleType(
  'openings', 
  'opening-id-456', 
  [file1, file2], 
  'contract'
);
```

### `apiUploadFilesToDocuments(tableName, id, data)`
Alternative endpoint: `POST :tablename/:id/documents`

```typescript
import { apiUploadFilesToDocuments } from '@/services/FileUploadService';

const response = await apiUploadFilesToDocuments('payment-vouchers', 'voucher-id-789', {
  files: [file1, file2],
  documentTypes: ['payment_voucher', 'confirmation']
});
```

## React Hooks

### `useDynamicFileUpload(options)`
Main hook for uploading files with multiple document types.

```typescript
import { useDynamicFileUpload } from '@/services/hooks/useDynamicFileUpload';

const uploadMutation = useDynamicFileUpload({
  onSuccess: (response) => console.log('Upload successful:', response),
  onError: (error) => console.error('Upload failed:', error),
  invalidateQueries: ['offers', 'openings'],
  showNotifications: true,
});

// Usage
await uploadMutation.mutateAsync({
  tableName: 'offers',
  id: 'offer-id-123',
  data: {
    files: [file1, file2],
    documentTypes: ['contract', 'id']
  }
});
```

### `useDynamicFileUploadWithSingleType(options)`
Simplified hook for single document type uploads.

```typescript
import { useDynamicFileUploadWithSingleType } from '@/services/hooks/useDynamicFileUpload';

const uploadMutation = useDynamicFileUploadWithSingleType({
  invalidateQueries: ['offers'],
});

// Usage
await uploadMutation.mutateAsync({
  tableName: 'openings',
  id: 'opening-id-456',
  files: [file1, file2],
  documentType: 'contract'
});
```

### `useDynamicFileUploadToDocuments(options)`
Hook for the documents endpoint.

```typescript
import { useDynamicFileUploadToDocuments } from '@/services/hooks/useDynamicFileUpload';

const uploadMutation = useDynamicFileUploadToDocuments({
  invalidateQueries: ['payment-vouchers'],
});

// Usage
await uploadMutation.mutateAsync({
  tableName: 'payment-vouchers',
  id: 'voucher-id-789',
  data: {
    files: [file1, file2],
    documentTypes: ['payment_voucher']
  }
});
```

## Migration from Old handleFileUpload

### Old Approach (Complex Conditional Logic)
```typescript
const handleFileUpload = useCallback(
  async (id: string, files: File[] | null, table?: string, fileType?: string) => {
    if (!files?.length) return;

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      if (table === 'offer' || (type === 'offers' && !table)) {
        formData.append('documentType', fileType || 'contract');
        await updateOfferMutation.mutateAsync({ id, data: formData as any });
      } else if (table === 'opening') {
        await updateOpeningMutation.mutateAsync({
          id,
          data: { files, documentType: fileType as OpeningFileType },
        });
      }
      // ... more complex conditions
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  },
  [type, updateOfferMutation, updateOpeningMutation, /* ... */]
);
```

### New Approach (Unified)
```typescript
const uploadMutation = useDynamicFileUpload({
  invalidateQueries: ['offers', 'openings', 'confirmations', 'payment-vouchers'],
});

const handleFileUpload = async (
  id: string, 
  files: File[] | null, 
  tableName: string, 
  documentType: string
) => {
  if (!files?.length) return;

  try {
    await uploadMutation.mutateAsync({
      tableName,
      id,
      data: {
        files,
        documentTypes: [documentType],
      },
    });
  } catch (error) {
    console.error('Error uploading files:', error);
  }
};
```

## Benefits

1. **Simplified Logic**: No more complex conditional statements
2. **Type Safety**: Full TypeScript support with proper interfaces
3. **Consistent API**: Same pattern for all uploads
4. **Better Error Handling**: Centralized error management
5. **Automatic Cache Management**: Built-in query invalidation
6. **User Feedback**: Automatic toast notifications
7. **Maintainable**: Easy to extend and modify
8. **Testable**: Simple to unit test

## Usage in Components

```typescript
import { useDynamicFileUploadWithSingleType } from '@/services/hooks/useDynamicFileUpload';

const MyComponent = () => {
  const uploadMutation = useDynamicFileUploadWithSingleType({
    invalidateQueries: ['offers'],
  });

  const handleFileUpload = async (files: File[]) => {
    try {
      await uploadMutation.mutateAsync({
        tableName: 'offers',
        id: 'offer-id',
        files,
        documentType: 'contract'
      });
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <button 
      onClick={() => handleFileUpload([/* files */])}
      disabled={uploadMutation.isPending}
    >
      {uploadMutation.isPending ? 'Uploading...' : 'Upload Files'}
    </button>
  );
};
```

## Supported Table Names

- `offers`
- `openings`
- `confirmations`
- `payment-vouchers`
- Any other entity that follows the API pattern

## Document Types

Common document types:
- `contract`
- `id`
- `extra`
- `payment_voucher`
- `confirmation`
- `opening`

The system is flexible and supports any document type your backend accepts. 