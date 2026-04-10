# AsyncSelect Component

A React component that provides a single-select dropdown with API integration, built on top of the existing Select component. This component is designed to be simpler than AsyncMultiSelect and **automatically detects default options**.

## Features

- **API Integration**: Fetches options from an API endpoint
- **Automatic Default Option**: Automatically detects and selects the option based on the current `value` prop
- **Single Selection**: Designed for single-value selection (not multi-select)
- **Form Integration**: Works seamlessly with react-hook-form
- **Loading States**: Shows loading indicator while fetching data
- **Error Handling**: Gracefully handles API errors
- **Sidebar Integration**: Refreshes data when sidebar visibility changes

## Props

| Prop             | Type    | Required | Description                                                                       |
| ---------------- | ------- | -------- | --------------------------------------------------------------------------------- |
| `api_url`        | string  | Yes      | The API endpoint to fetch options from                                            |
| `queryKey`       | string  | Yes      | Unique key for React Query caching                                                |
| `optLabelKey`    | string  | No       | Key for the label property in API response (default: 'name')                      |
| `optValueKey`    | string  | No       | Key for the value property in API response (default: '\_id')                      |
| `value`          | any     | No       | Current value - the component automatically finds and selects the matching option |
| `searchKey`      | string  | No       | Key for search parameter in API request                                           |
| `sidebarVisible` | boolean | No       | Whether sidebar is visible (for data refresh)                                     |
| `isClearable`    | boolean | No       | Whether the selection can be cleared                                              |
| `placeholder`    | string  | No       | Placeholder text when no option is selected                                       |
| `isDisabled`     | boolean | No       | Whether the select is disabled                                                    |

## Usage

### Basic Usage

```tsx
import AsyncSelect from '@/components/shared/AsyncSelect';

<AsyncSelect
  api_url="/api/banks"
  queryKey="banks"
  optLabelKey="name"
  optValueKey="_id"
  placeholder="Select a bank..."
  isClearable
/>;
```

### With Default Value (Automatic Detection)

```tsx
<AsyncSelect
  api_url="/api/banks"
  queryKey="banks"
  optLabelKey="name"
  optValueKey="_id"
  value="64f8a1b2c3d4e5f6a7b8c9d0" // This ID will be automatically selected when data loads
  placeholder="Select a bank..."
/>
```

### With React Hook Form

```tsx
import { useForm, Controller } from 'react-hook-form';
import AsyncSelect from '@/components/shared/AsyncSelect';

const { control } = useForm({
  defaultValues: {
    selectedBank: '64f8a1b2c3d4e5f6a7b8c9d0', // This will be automatically selected
  },
});

<Controller
  name="selectedBank"
  control={control}
  render={({ field: { onChange, value } }) => (
    <AsyncSelect
      api_url="/api/banks"
      queryKey="banks"
      optLabelKey="name"
      optValueKey="_id"
      value={value}
      onChange={(option) => {
        if (option && typeof option === 'object' && 'value' in option) {
          onChange(option.value);
        } else {
          onChange(undefined);
        }
      }}
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

// The component will automatically select the option matching the form's current value
```

## How Default Option Detection Works

The component automatically detects and selects the default option by:

1. **Receiving the current value** through the `value` prop
2. **Fetching options** from the API
3. **Finding the matching option** by comparing the `value` prop with each option's value
4. **Setting the selected option** automatically when data loads

**Important**: The component now handles the case where the field has a value but the API options haven't loaded yet. It will:

- Show the selected value immediately if it exists in the form
- Automatically find and display the matching option once the API data loads
- Handle both scenarios seamlessly without requiring manual configuration

This means you don't need to manually specify which option to select - just pass the current value and the component handles the rest!

### Example: Field with Existing Value

```tsx
// If your form field already has a value (e.g., from editing an existing record)
const { control } = useForm({
  defaultValues: {
    bank_id: '64f8a1b2c3d4e5f6a7b8c9d0', // Existing bank ID
  },
});

<Controller
  name="bank_id"
  control={control}
  render={({ field: { onChange, value } }) => (
    <AsyncSelect
      api_url="/api/banks"
      queryKey="banks"
      value={value} // This existing value will be automatically selected
      onChange={onChange}
    />
  )}
/>;
```

The AsyncSelect will:

1. Immediately show that a value is selected
2. Fetch the bank options from the API
3. Automatically find and display the bank with ID '64f8a1b2c3d4e5f6a7b8c9d0'
4. Show the bank name in the select field

## API Response Format

The component expects the API to return data in one of these formats:

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

## Differences from AsyncMultiSelect

- **Single Selection**: Only allows selecting one option
- **Simpler Interface**: No multi-value handling
- **Automatic Default**: Automatically detects and selects the option based on current value
- **No "Add New" Options**: Doesn't include special "Add New" options
- **Cleaner API**: More focused on single-selection use cases

## Styling

The component uses the same styling system as other Select components in the project. Custom styles can be applied through the `styles` prop or by overriding CSS classes.

## Error Handling

- Logs errors to console if required props are missing
- Gracefully handles API failures
- Shows loading state during API calls
- Refreshes data when sidebar visibility changes

## Troubleshooting

### Height Consistency Issues

If you notice that Select components have different heights, ensure:

1. **Consistent Size Props**: All Select components should use the same `size` prop
2. **No Conflicting Styles**: Avoid overriding height-related styles in custom styles
3. **Form Field Consistency**: Use the same field configuration for similar select fields

### Common Issues and Solutions

#### Issue: Select components have different heights

**Solution**: Ensure all Select components use the same `size` prop and avoid custom height styles

```tsx
// ✅ Good - Consistent sizing
<AsyncSelect size="md" />
<Select size="md" />

// ❌ Bad - Inconsistent sizing
<AsyncSelect size="sm" />
<Select size="lg" />
```

#### Issue: Custom styles overriding default heights

**Solution**: Remove conflicting height styles from custom styles

```tsx
// ✅ Good - No height conflicts
const customStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    borderRadius: 10,
    borderColor: state?.isFocused ? '#c2c0bc' : provided?.borderColor,
  }),
};

// ❌ Bad - Height conflicts
const customStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    minHeight: 32, // This overrides default sizing
    height: 'auto', // This can cause inconsistencies
  }),
};
```

## Performance

- Uses React Query for efficient data fetching and caching
- Implements refresh key system for forced re-renders
- Optimized to prevent unnecessary API calls
- Memoized to prevent unnecessary re-renders
