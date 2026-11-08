import { z } from 'zod';

export const timeEntryCreateSchema = z.object({
  userId: z.string().cuid().optional().nullable(),
  taskId: z.string().cuid().optional().nullable(),
  date: z.string().datetime('Valid date is required'),
  hours: z.string().refine(
    (val) => {
      const n = Number(val);
      return !isNaN(n) && n > 0;
    },
    { message: 'Hours must be a positive number' }
  ),
  description: z.string().max(5000).optional().nullable(),
  billable: z.boolean().default(false),
});

export const timeEntryUpdateSchema = z
  .object({
    userId: z.string().cuid().optional().nullable(),
    taskId: z.string().cuid().optional().nullable(),
    date: z.string().datetime().optional(),
    hours: z.string().optional(),
    description: z.string().max(5000).optional().nullable(),
    billable: z.boolean().optional(),
  })
  .partial()
  .strict()
  .refine(
    (data) =>
      data.userId !== undefined ||
      data.taskId !== undefined ||
      data.date !== undefined ||
      data.hours !== undefined ||
      data.description !== undefined ||
      data.billable !== undefined,
    'At least one field must be provided for update'
  );

export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>;
export type TimeEntryUpdateInput = z.infer<typeof timeEntryUpdateSchema>;
