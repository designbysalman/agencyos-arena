import { z } from 'zod';

/**
 * Zod validation schemas for Document Link (shareable link) operations.
 * Organization ID is never accepted from the client - it is resolved
 * from the authenticated user's session context.
 */

export const documentLinkCreateSchema = z.object({
  documentId: z.string().cuid('Valid document ID is required'),
  expiresAt: z.string().datetime('Valid expiry date is required'),
  maxAccess: z.coerce.number().int().positive().optional().nullable(),
});

export const documentLinkVerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type DocumentLinkCreateInput = z.infer<typeof documentLinkCreateSchema>;
export type DocumentLinkVerifyInput = z.infer<typeof documentLinkVerifySchema>;
