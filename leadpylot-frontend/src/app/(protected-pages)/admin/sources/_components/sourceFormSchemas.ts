import { z } from 'zod';

const priceField = z
  .union([z.string(), z.number()])
  .transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  })
  .pipe(z.number().min(0, 'Price must be a positive number'));

const hexRefine = (v: string | undefined | null) =>
  v === undefined ||
  v === null ||
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(v);

/** Empty → undefined; normalize # prefix and lowercase. */
const optionalHexColorField = z
  .string()
  .optional()
  .transform((v) => {
    if (v == null || String(v).trim() === '') return undefined;
    const raw = String(v).trim();
    return raw.startsWith('#') ? raw : `#${raw}`;
  })
  .refine(hexRefine, { message: 'Enter a valid hex color (e.g. #3b82f6)' })
  .transform((v) => (v === undefined ? undefined : v.toLowerCase()));

const sourceFormFields = {
  name: z.string().min(1, 'Name is required'),
  price: priceField,
  provider_id: z.string().optional(),
  color: optionalHexColorField,
};

export const createSourceFormSchema = z.object(sourceFormFields);

export const updateSourceFormSchema = z.object(sourceFormFields);

export type CreateSourceFormInput = z.input<typeof createSourceFormSchema>;
export type UpdateSourceFormInput = z.input<typeof updateSourceFormSchema>;
export type SourceFormParsed = z.output<typeof createSourceFormSchema>;
