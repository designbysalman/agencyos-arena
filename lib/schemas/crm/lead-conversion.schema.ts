import { z } from 'zod';

/**
 * Zod validation schema for Lead-to-Opportunity conversion.
 * Organization ID is never accepted from the client - it is resolved
 * from the authenticated user's session context.
 */

export const leadConvertSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  value: z.string().optional().nullable(),
  currency: z.string().min(1).max(10).optional(),
  pipelineId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  closeDate: z.string().optional().nullable(),
});

export type LeadConvertInput = z.infer<typeof leadConvertSchema>;
