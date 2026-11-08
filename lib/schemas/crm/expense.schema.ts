import { z } from 'zod';

/**
 * Zod validation schemas for ExpenseItem CRUD operations.
 * Organization ID is never accepted from the client - it is resolved
 * from the authenticated user's session context.
 */

export const expenseCreateSchema = z.object({
  projectId: z.string().cuid().optional().nullable(),
  category: z.string().min(1, 'Category is required').max(100),
  amount: z.string().refine(
    (val) => {
      const n = Number(val);
      return !isNaN(n) && n > 0;
    },
    { message: 'Amount must be a positive number' }
  ),
  expenseDate: z.string().datetime('Valid date is required'),
  receiptUrl: z.string().url().optional().nullable(),
  billable: z.boolean().default(false),
});

export const expenseUpdateSchema = expenseCreateSchema
  .partial()
  .strict()
  .refine(
    (data) =>
      data.projectId !== undefined ||
      data.category !== undefined ||
      data.amount !== undefined ||
      data.expenseDate !== undefined ||
      data.receiptUrl !== undefined ||
      data.billable !== undefined,
    'At least one field must be provided for update'
  );

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
