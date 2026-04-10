# Rich Text Editor (Jodit)

Jodit-based Rich Text Editor component for React/Next.js with react-hook-form integration.

## Requirements (already in project)

- React 18+, Next.js 14+, react-hook-form
- Tailwind CSS (for styling)
- jodit-react (installed in root package.json)
- Jodit CSS is copied to `public/jodit.min.css` via postinstall script

## Usage

### 1. FormProvider দিয়ে wrap করুন

এই component `react-hook-form` এর `FormProvider` এর ভিতরে থাকতে হবে:

```tsx
import { FormProvider, useForm } from 'react-hook-form'
import { RichTextEditor } from '@/components/shared/rich-text-editor'

function MyForm() {
  const methods = useForm({
    defaultValues: { description: '' }
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <RichTextEditor name="description" />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  )
}
```

### 2. Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | string | required | Form field name (supports nested: `user.bio`) |
| `className` | string | - | Additional CSS classes |
| `placeholder` | string | `'Enter description...'` | Placeholder text |
| `height` | number | `350` | Editor height in pixels |
| `editorRef` | (editor) => void | - | Callback to get Jodit instance |

### 3. Import path

```tsx
import { RichTextEditor } from '@/components/shared/rich-text-editor'
```

## Styling

Uses project theme: `--color-border`, `border-border`, `bg-sand-4`, `text-rust` (for errors).

## File Structure

```
rich-text-editor/
├── RichTextEditor.tsx   # Main component
├── index.ts             # Exports
├── package.json         # Metadata
└── README.md            # This file
```
