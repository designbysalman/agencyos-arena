import { z } from 'zod';

/**
 * Zod validation schemas for Contract CRUD operations.
 * Organization ID is never accepted from the client - it is resolved
 * from the authenticated user's session context.
 */

const baseContractSchema = z.object({
  proposalId: z.string().cuid().optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200),
  status: z.string().min(1).max(50).default('draft'),
});

export const contractCreateSchema = baseContractSchema.strict();

export const contractUpdateSchema = baseContractSchema
  .partial()
  .strict()
  .refine(
    (data) =>
      data.proposalId !== undefined ||
      data.projectId !== undefined ||
      data.title !== undefined ||
      data.status !== undefined,
    'At least one field must be provided for update'
  );

export const contractSignSchema = z.object({
  signatureReference: z.string().optional(),
  signerName: z.string().min(1, 'Signer name is required'),
  signerEmail: z.string().email('Valid email is required'),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type ContractCreateInput = z.infer<typeof contractCreateSchema>;
export type ContractUpdateInput = z.infer<typeof contractUpdateSchema>;
export type ContractSignInput = z.infer<typeof contractSignSchema>;
