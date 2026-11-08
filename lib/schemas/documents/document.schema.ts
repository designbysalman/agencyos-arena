import { z } from 'zod';

/**
 * Zod validation schemas for Document CRUD operations.
 * Organization ID is never accepted from the client - it is resolved
 * from the authenticated user's session context.
 */

const baseDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.string().min(1, 'Document type is required').max(50),
  folder: z.string().optional().nullable(),
  visibility: z.string().min(1).max(20).default('private'),
  fileAssetId: z.string().cuid().optional().nullable(),
});

export const documentCreateSchema = baseDocumentSchema.strict();

export const documentUpdateSchema = baseDocumentSchema
  .partial()
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.type !== undefined ||
      data.folder !== undefined ||
      data.visibility !== undefined ||
      data.fileAssetId !== undefined,
    'At least one field must be provided for update'
  );

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
