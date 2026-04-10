# Multipart Form Data Implementation for Bank Forms

## Overview

Updated the Bank Form system to handle multipart form data, enabling file uploads (specifically bank logos) along with regular form fields.

## Changes Made

### 1. BankForm.tsx

**Purpose**: Convert form data to FormData format for multipart submission

**Changes**:

- Updated `Props` interface to accept `FormData` instead of `BankFormValues`
- Modified `handleFormSubmit` function to create FormData object
- Added proper handling for different field types:
  - File uploads (logo)
  - Array fields (projects)
  - Boolean fields
  - Number fields
  - String fields

**Key Implementation**:

```typescript
const handleFormSubmit: SubmitHandler<BankFormValues> = (data) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === 'logo' && value instanceof File) {
        formData.append('logo', value);
      } else if (key === 'projects' && Array.isArray(value)) {
        value.forEach((projectId, index) => {
          formData.append(`projects[${index}]`, projectId);
        });
      } else if (typeof value === 'boolean') {
        formData.append(key, value.toString());
      } else if (typeof value === 'number') {
        formData.append(key, value.toString());
      } else {
        formData.append(key, value as string);
      }
    }
  });

  onSubmit(formData);
};
```

### 2. BankFormWrapperComponent.tsx

**Purpose**: Update wrapper to handle FormData submission

**Changes**:

- Removed `BankFormValues` import
- Updated `onSubmit` prop to accept `FormData`
- Updated mutation function parameter type

### 3. SettingsService.ts

**Purpose**: Update API functions to handle multipart requests

**Changes**:

- Updated `apiCreateBank` and `apiUpdateBank` to accept `FormData`
- Added `Content-Type: multipart/form-data` headers
- Cast FormData to `any` for axios compatibility

**Key Implementation**:

```typescript
export async function apiUpdateBank(data: FormData, id: string) {
  return ApiService.fetchDataWithAxios<CreateBankResponse>({
    url: `/banks/${id}`,
    method: 'PUT',
    data: data as any, // Cast FormData to any for axios compatibility
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}
```

### 4. useSettings.ts

**Purpose**: Update hook types to handle FormData

**Changes**:

- Removed `BankFormValues` import
- Updated mutation function parameter types to `FormData`

## Backend Expectations

The backend now receives multipart form data with:

- **File fields**: `logo` (File object)
- **Array fields**: `projects[0]`, `projects[1]`, etc.
- **String fields**: All other form fields as strings
- **Boolean/Number fields**: Converted to strings

## Benefits

1. **File Upload Support**: Can now upload bank logos
2. **Proper Content-Type**: Uses `multipart/form-data` for file uploads
3. **Backward Compatibility**: All existing form fields still work
4. **Type Safety**: Maintains TypeScript type checking where possible

## Testing

To test the implementation:

1. Fill out the bank form with all fields including logo upload
2. Submit the form
3. Verify that the backend receives multipart form data
4. Check that file uploads are handled correctly
5. Ensure all other form fields are properly converted and sent

## File Structure Updated

```
admin/banks/
├── _components/
│   ├── BankForm.tsx                    # ✅ Updated for FormData
│   └── [id]/_components/
│       └── BankFormWrapperComponent.tsx # ✅ Updated for FormData
├── services/
│   ├── SettingsService.ts              # ✅ Updated API functions
│   └── hooks/
│       └── useSettings.ts              # ✅ Updated hook types
```

This implementation ensures that the backend receives properly formatted multipart form data with file uploads and all form fields correctly handled.
