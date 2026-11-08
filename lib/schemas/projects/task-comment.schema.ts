import { z } from 'zod';

export const taskCommentCreateSchema = z.object({
  taskId: z.string().cuid('Valid task ID is required'),
  userId: z.string().cuid('Valid user ID is required'),
  comment: z.string().min(1, 'Comment is required').max(10000),
});

export const taskCommentUpdateSchema = z
  .object({
    comment: z.string().min(1).max(10000).optional(),
  })
  .partial()
  .strict()
  .refine((data) => data.comment !== undefined, 'Comment must be provided for update');

export type TaskCommentCreateInput = z.infer<typeof taskCommentCreateSchema>;
export type TaskCommentUpdateInput = z.infer<typeof taskCommentUpdateSchema>;
