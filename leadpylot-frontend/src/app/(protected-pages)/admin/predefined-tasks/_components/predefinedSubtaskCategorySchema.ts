import { z } from 'zod';

export const predefinedSubtaskCategorySchema = z.object({
  taskCategoryTitle: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less'),
  taskCategoryDescription: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  tags: z.string().optional(),
  isStandaloneEnabled: z.boolean(),
  isActive: z.boolean(),
});

export type PredefinedSubtaskCategoryFormData = z.input<typeof predefinedSubtaskCategorySchema>;
