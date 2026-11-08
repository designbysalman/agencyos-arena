import { z } from 'zod';

export const changeOrderCreateSchema = z.object({
  projectId: z.string().cuid('Valid project ID is required'),
  description: z.string().min(1, 'Description is required').max(5000),
  amount: z.string().refine(
    (val) => {
      const n = Number(val);
      return !isNaN(n);
    },
    { message: 'Amount must be a valid number' }
  ),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  approvedBy: z.string().cuid().optional().nullable(),
});

export const changeOrderUpdateSchema = z
  .object({
    description: z.string().min(1).max(5000).optional(),
    amount: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    approvedBy: z.string().cuid().optional().nullable(),
  })
  .partial()
  .strict()
  .refine(
    (data) =>
      data.description !== undefined ||
      data.amount !== undefined ||
      data.status !== undefined ||
      data.approvedBy !== undefined,
    'At least one field must be provided for update'
  );

export type ChangeOrderCreateInput = z.infer<typeof changeOrderCreateSchema>;
export type ChangeOrderUpdateInput = z.infer<typeof changeOrderUpdateSchema>;
