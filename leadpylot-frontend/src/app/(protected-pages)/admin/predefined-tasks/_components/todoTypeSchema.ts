import { z } from 'zod';

// Simple todo item schema - no complex validation
export const todoItemSchema = z.object({
  _id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  isCompleted: z.boolean().optional(),
  dueDate: z.string().optional(),
  assigned: z.string().optional(),
  isDelete: z.boolean().optional(),
});

// Simple schema - only validate required fields
export const predefinedSubtaskSchema = z.object({
  taskTitle: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  taskDescription: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.array(z.string()).min(1, 'Category is required'),
  tags: z.string().optional(),
  isActive: z.boolean(),
  todo: z.array(todoItemSchema).optional(),
});

export type TodoItemFormData = z.infer<typeof todoItemSchema>;
export type PredefinedSubtaskFormData = z.infer<typeof predefinedSubtaskSchema>;

// Keep old schema for backward compatibility if needed
export const todoTypeSchema = predefinedSubtaskSchema;
export type TodoTypeFormData = PredefinedSubtaskFormData;
