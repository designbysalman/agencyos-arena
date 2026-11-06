import { z } from 'zod';

/**
 * Zod validation schemas for Quotation CRUD operations.
 * All schemas enforce server-side validation on every request.
 * Organization ID is never accepted from the client - it is resolved
 * from the authenticated user's session context.
 */

const baseQuotationSchema = z.object({
  opportunityId: z.string().cuid().optional().nullable(),
  contactId: z.string().cuid().optional().nullable(),
  accountId: z.string().cuid().optional().nullable(),
  clientName: z.string().min(1).max(200).optional().nullable(),
  clientEmail: z.string().email().max(200).optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.string().min(1, 'Status is required').max(50),
  subtotal: z.string().optional().nullable(),
  discount: z.string().optional().nullable(),
  tax: z.string().optional().nullable(),
  total: z.string().optional().nullable(),
  currency: z.string().min(1).max(10).default('USD'),
  validUntil: z.string().optional().nullable(),
});

export const quotationCreateSchema = baseQuotationSchema.strict();

export const quotationUpdateSchema = baseQuotationSchema
  .partial()
  .strict()
  .refine(
    (data) =>
      data.opportunityId !== undefined ||
      data.contactId !== undefined ||
      data.accountId !== undefined ||
      data.clientName !== undefined ||
      data.clientEmail !== undefined ||
      data.title !== undefined ||
      data.description !== undefined ||
      data.status !== undefined ||
      data.subtotal !== undefined ||
      data.discount !== undefined ||
      data.tax !== undefined ||
      data.total !== undefined ||
      data.currency !== undefined ||
      data.validUntil !== undefined,
    'At least one field must be provided for update'
  );

export const quotationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  contactId: z.string().cuid().optional(),
  accountId: z.string().cuid().optional(),
  opportunityId: z.string().cuid().optional(),
  status: z.string().optional(),
  sortBy: z
    .enum(['title', 'status', 'total', 'validUntil', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: z.coerce.boolean().default(false),
});

export type QuotationCreateInput = z.infer<typeof quotationCreateSchema>;
export type QuotationUpdateInput = z.infer<typeof quotationUpdateSchema>;
export type QuotationQueryInput = z.infer<typeof quotationQuerySchema>;
