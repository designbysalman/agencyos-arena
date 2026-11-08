import { z } from 'zod';

export const projectApprovalCreateSchema = z.object({
  projectId: z.string().cuid('Valid project ID is required'),
  contactId: z.string().cuid().optional().nullable(),
  status: z.enum(['pending', 'approved', 'changes_requested']).default('pending'),
  feedback: z.string().max(5000).optional().nullable(),
});

export const projectApprovalUpdateSchema = z
  .object({
    contactId: z.string().cuid().optional().nullable(),
    status: z.enum(['pending', 'approved', 'changes_requested']).optional(),
    feedback: z.string().max(5000).optional().nullable(),
  })
  .partial()
  .strict()
  .refine(
    (data) =>
      data.contactId !== undefined || data.status !== undefined || data.feedback !== undefined,
    'At least one field must be provided for update'
  );

export type ProjectApprovalCreateInput = z.infer<typeof projectApprovalCreateSchema>;
export type ProjectApprovalUpdateInput = z.infer<typeof projectApprovalUpdateSchema>;
