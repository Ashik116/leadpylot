# SelectComponent

A simple, lightweight React component that handles API calls and default value selection for dropdown selects. This component replaces the more complex AsyncSelect and provides a cleaner, more focused API.

## Features

- **API Integration**: Automatically fetches options from an API endpoint
- **Default Value Selection**: Automatically finds and selects options based on the `value` prop
- **Smart Data Fetching**: Fetches specific items by ID when they're not in the main response
- **Edit Mode Support**: Works seamlessly in both create and edit modes
- **Loading States**: Shows loading indicators and temporary placeholders
- **Form Integration**: Works perfectly with react-hook-form

## Props

| Prop          | Type                         | Required | Description                                                     |
| ------------- | ---------------------------- | -------- | --------------------------------------------------------------- |
| `apiUrl`      | string                       | Yes      | The API endpoint to fetch options from                          |
| `queryKey`    | string                       | Yes      | Unique key for React Query caching                              |
| `optLabelKey` | string                       | No       | Key for the label property (default: 'name')                    |
| `optValueKey` | string                       | No       | Key for the value property (default: '\_id')                    |
| `value`       | string \| number             | No       | Current value - automatically finds and selects matching option |
| `onChange`    | function                     | Yes      | Callback when selection changes                                 |
| `placeholder` | string                       | No       | Placeholder text (default: 'Select option...')                  |
| `isClearable` | boolean                      | No       | Whether selection can be cleared (default: true)                |
| `isDisabled`  | boolean                      | No       | Whether the select is disabled (default: false)                 |
| `size`        | 'xs' \| 'sm' \| 'md' \| 'lg' | No       | Size of the select (default: 'md')                              |
| `field`       | object                       | No       | Field info for debugging (e.g., `{ name: 'fieldName' }`)        |

## Usage

### Basic Usage

```tsx
import SelectComponent from '@/components/shared/SelectComponent';

<SelectComponent
  apiUrl="/api/banks"
  queryKey="banks"
  optLabelKey="name"
  optValueKey="_id"
  placeholder="Select a bank..."
  value={selectedBank}
  onChange={setSelectedBank}
/>;
```

### With React Hook Form

```tsx
import { useForm, Controller } from 'react-hook-form';
import SelectComponent from '@/components/shared/SelectComponent';

const { control } = useForm({
  defaultValues: {
    bank_id: '64f8a1b2c3d4e5f6a7b8c9d0', // Existing value for edit mode
  },
});

<Controller
  name="bank_id"
  control={control}
  render={({ field: { onChange, value } }) => (
    <SelectComponent
      apiUrl="/api/banks"
      queryKey="banks"
      optLabelKey="name"
      optValueKey="_id"
      value={value}
      onChange={onChange}
      field={{ name: 'bank_id' }}
    />
  )}
/>;
```

### In FormField Component

```tsx
const fieldDefinition = {
  name: 'bank_id',
  label: 'Select Bank',
  type: 'asyncSelectSingle',
  apiUrl: '/api/banks',
  queryKey: 'banks',
  optLabelKey: 'name',
  optValueKey: '_id',
  placeholder: 'Choose a bank...',
  isClearable: true,
};
```

## How It Works

### 1. **API Data Fetching**

- Fetches options from the main API endpoint
- Handles different API response structures automatically
- Uses React Query for efficient caching and data management

### 2. **Default Value Detection**

- When a `value` prop is provided, the component automatically finds the matching option
- First searches in the main API response
- If not found, makes a specific API call to fetch the item by ID
- Shows "Loading... (ID: xxx)" while fetching

### 3. **Edit Mode Support**

- Automatically detects when editing existing records
- Shows the selected value immediately
- Fetches the specific item data if needed
- Handles all edge cases gracefully

### 4. **Selection Mode**

- Works normally for new selections
- Shows placeholder text when no value is selected
- Allows users to change selections freely

## API Response Format

The component handles these API response structures:

```json
// Format 1: Direct array
[
  { "name": "Bank A", "_id": "123" },
  { "name": "Bank B", "_id": "456" }
]

// Format 2: Nested data property
{
  "data": [
    { "name": "Bank A", "_id": "123" },
    { "name": "Bank B", "_id": "456" }
  ]
}

// Format 3: Special case for email_templates
{
  "templates": [
    { "name": "Template A", "_id": "123" },
    { "name": "Template B", "_id": "456" }
  ]
}
```

## Benefits Over AsyncSelect

- **Simpler API**: Fewer props, cleaner interface
- **Better Performance**: More focused data fetching
- **Easier Debugging**: Clearer logging and error handling
- **Consistent Behavior**: Predictable default value selection
- **Smaller Bundle**: Less code, faster loading

## Testing

Use the `SelectComponentTest.tsx` component to test:

- Create mode functionality
- Edit mode with existing values
- Default option selection
- API integration
- Form integration

## Migration from AsyncSelect

To migrate from AsyncSelect to SelectComponent:

1. **Change import**: `AsyncSelect` → `SelectComponent`
2. **Update props**: `api_url` → `apiUrl`
3. **Simplify onChange**: The component handles option extraction automatically
4. **Add field prop**: For better debugging and identification

The SelectComponent provides the same functionality with a cleaner, more maintainable codebase.
