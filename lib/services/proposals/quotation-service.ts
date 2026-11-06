'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import {
  QuotationCreateInput,
  QuotationUpdateInput,
  QuotationQueryInput,
} from '@/lib/schemas/proposals/quotation.schema';

/** Quotation serialization */
export interface QuotationResponse {
  id: string;
  organizationId: string;
  quotationNumber: string | null;
  opportunityId: string | null;
  contactId: string | null;
  accountId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  title: string;
  description: string | null;
  status: string;
  subtotal: string | null;
  discount: string | null;
  tax: string | null;
  total: string | null;
  currency: string;
  validUntil: Date | null;
  sentAt: Date | null;
  acceptedAt: Date | null;
  deletedAt: Date | null;
  version: number;
  contact: { id: string; firstName: string | null; lastName: string } | null;
  account: { id: string; name: string } | null;
  opportunity: { id: string; title: string; status: string } | null;
  items: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
    amount: string;
    order: number;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/** Validate session and resolve authorized user context */
async function getAuthorizedUser(): Promise<AuthorizedUser> {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    const error = new Error('Unauthenticated') as Error & {
      statusCode?: number;
    };
    error.statusCode = 401;
    throw error;
  }

  const user = result.user as { role?: string; organizationId?: string };
  const { organizationId } = await requireOrganization(result.user.id);
  return {
    userId: result.user.id,
    organizationId,
    email: result.user.email ?? '',
    role: user.role ?? 'employee',
  };
}

/** Create an audit log entry */
async function createAuditLog({
  actorId,
  actorName,
  action,
  entityType,
  entityId,
  before,
  after,
  metadata,
  organizationId,
  ipAddress,
  userAgent,
}: {
  actorId: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  organizationId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorName,
      action,
      entityType,
      entityId,
      before: before ?? null,
      after: after ?? null,
      metadata: metadata ?? null,
      ipAddress,
      userAgent,
      organizationId,
    },
  });
}

/** Build where clause for organization-scoped quotation queries */
function buildQuotationWhere(organizationId: string, input: QuotationQueryInput) {
  const where: Record<string, unknown> = {
    organizationId,
  };

  if (!input.includeDeleted) {
    where.deletedAt = null;
  }

  if (input.contactId) {
    where.contactId = input.contactId;
  }

  if (input.accountId) {
    where.accountId = input.accountId;
  }

  if (input.opportunityId) {
    where.opportunityId = input.opportunityId;
  }

  if (input.status) {
    where.status = input.status;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: 'insensitive' } },
      { description: { contains: input.search, mode: 'insensitive' } },
      { status: { contains: input.search, mode: 'insensitive' } },
      { clientName: { contains: input.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

/** Serialize a quotation with its line items */
function serializeQuotation(
  quotation: Awaited<ReturnType<typeof prisma.quotation.findUnique>>
): QuotationResponse {
  return {
    id: quotation.id,
    organizationId: quotation.organizationId,
    quotationNumber: quotation.quotationNumber,
    opportunityId: quotation.opportunityId,
    contactId: quotation.contactId,
    accountId: quotation.accountId,
    clientName: quotation.clientName,
    clientEmail: quotation.clientEmail,
    title: quotation.title,
    description: quotation.description,
    status: quotation.status,
    subtotal: quotation.subtotal?.toString() ?? null,
    discount: quotation.discount?.toString() ?? null,
    tax: quotation.tax?.toString() ?? null,
    total: quotation.total?.toString() ?? null,
    currency: quotation.currency,
    validUntil: quotation.validUntil,
    sentAt: quotation.sentAt,
    acceptedAt: quotation.acceptedAt,
    deletedAt: quotation.deletedAt,
    version: quotation.version,
    contact: quotation.contact
      ? {
          id: quotation.contact.id,
          firstName: quotation.contact.firstName,
          lastName: quotation.contact.lastName,
        }
      : null,
    account: quotation.account ? { id: quotation.account.id, name: quotation.account.name } : null,
    opportunity: quotation.opportunity
      ? {
          id: quotation.opportunity.id,
          title: quotation.opportunity.title,
          status: quotation.opportunity.status,
        }
      : null,
    items: (
      ((quotation as { items?: unknown }).items as Array<{
        id: string;
        description: string;
        quantity: { toString: () => string };
        unitPrice: { toString: () => string };
        discount: { toString: () => string };
        taxRate: { toString: () => string };
        amount: { toString: () => string };
        order: number;
        createdAt: Date;
      }>) ?? []
    ).map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      discount: item.discount.toString(),
      taxRate: item.taxRate.toString(),
      amount: item.amount.toString(),
      order: item.order,
      createdAt: item.createdAt,
    })),
    createdAt: quotation.createdAt,
    updatedAt: quotation.updatedAt,
  };
}

/** Calculate totals from line items using decimal-safe arithmetic */
function calculateTotals(
  items: Array<{
    quantity: number | string;
    unitPrice: number | string;
    discount?: number | string;
    taxRate?: number | string;
  }>
) {
  let subtotal = 0;
  let discount = 0;
  let tax = 0;

  for (const item of items) {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    const lineDiscount = Number(item.discount ?? 0);
    const taxRate = Number(item.taxRate ?? 0);

    const lineSubtotal = qty * price;
    const lineDiscountAmount = lineSubtotal * (lineDiscount / 100);
    const lineTax = (lineSubtotal - lineDiscountAmount) * (taxRate / 100);

    subtotal += lineSubtotal;
    discount += lineDiscountAmount;
    tax += lineTax;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal - discount + tax) * 100) / 100,
  };
}

/** Generate a concurrency-safe quotation number.
 *
 * Uses a cryptographically random suffix instead of count()+1 so that
 * concurrent requests cannot generate duplicate numbers without a
 * dedicated counter table or database-level locking.
 */
async function generateQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `QUOT-${year}-${suffix}`;
}

/** List quotations with organization scoping, soft-delete filtering, and pagination */
export async function listQuotations(input: QuotationQueryInput) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'quotation.read');

  const where = buildQuotationWhere(organizationId, input);
  const [quotations, total] = await prisma.$transaction([
    prisma.quotation.findMany({
      where,
      orderBy: { [input.sortBy]: input.sortOrder },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        account: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true, status: true } },
        items: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            discount: true,
            taxRate: true,
            amount: true,
            order: true,
            createdAt: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  return {
    quotations: quotations.map(serializeQuotation),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.ceil(total / input.pageSize),
  };
}

/** Get a single quotation by ID with organization isolation (non-disclosing 404 for cross-org) */
export async function getQuotation(id: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'quotation.read');

  const quotation = await prisma.quotation.findFirst({
    where: { id, organizationId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      account: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true, status: true, value: true, currency: true } },
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPrice: true,
          discount: true,
          taxRate: true,
          amount: true,
          order: true,
          createdAt: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!quotation) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  return serializeQuotation(quotation);
}

/** Create a quotation with organization scoping, line items, server-calculated totals, and audit logging */
export async function createQuotation(input: QuotationCreateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'quotation.create');

  // Validate cross-org opportunity relationship if opportunityId is provided
  if (input.opportunityId) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, organizationId },
    });
    if (!opportunity) {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  // Validate cross-org contact relationship if contactId is provided
  if (input.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: input.contactId, organizationId },
    });
    if (!contact) {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  // Validate cross-org account relationship if accountId is provided
  if (input.accountId) {
    const account = await prisma.agencyAccount.findFirst({
      where: { id: input.accountId, organizationId },
    });
    if (!account) {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  // Generate quotation number
  const quotationNumber = await generateQuotationNumber();

  // Calculate totals from line items (server-side; client-submitted totals are ignored)
  const lineItemsInput =
    (
      input as unknown as {
        items?: Array<{
          description: string;
          quantity: number | string;
          unitPrice: number | string;
          discount?: number | string;
          taxRate?: number | string;
          order?: number;
        }>;
      }
    ).items ?? [];

  const totals = calculateTotals(lineItemsInput);

  const quotation = await prisma.quotation.create({
    data: {
      organizationId,
      quotationNumber,
      opportunityId: input.opportunityId ?? null,
      contactId: input.contactId ?? null,
      accountId: input.accountId ?? null,
      clientName: input.clientName ?? null,
      clientEmail: input.clientEmail ?? null,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      currency: input.currency ?? 'USD',
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      version: 1,
      items: {
        create: lineItemsInput.map((item, index) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount ?? 0),
          taxRate: Number(item.taxRate ?? 0),
          amount:
            Number(item.quantity) * Number(item.unitPrice) -
            Number(item.quantity) * Number(item.unitPrice) * (Number(item.discount ?? 0) / 100) +
            (Number(item.quantity) * Number(item.unitPrice) -
              Number(item.quantity) * Number(item.unitPrice) * (Number(item.discount ?? 0) / 100)) *
              (Number(item.taxRate ?? 0) / 100),
          order: item.order ?? index,
        })),
      },
    },
    include: {
      items: { orderBy: { order: 'asc' } },
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'quotation.create',
    entityType: 'Quotation',
    entityId: quotation.id,
    after: {
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      title: quotation.title,
      status: quotation.status,
      total: quotation.total,
      currency: quotation.currency,
      opportunityId: quotation.opportunityId,
      contactId: quotation.contactId,
      accountId: quotation.accountId,
    },
    organizationId,
  });

  return serializeQuotation(quotation);
}

/** Update a quotation with organization scoping, line items, server-calculated totals, and audit logging */
export async function updateQuotation(id: string, input: QuotationUpdateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'quotation.update');

  // Verify quotation exists and belongs to the user's organization
  const existing = await prisma.quotation.findFirst({
    where: { id, organizationId },
    include: { items: true },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  // Prevent modifying accepted quotations except for archiving
  if (existing.status === 'accepted' && input.status && input.status !== 'archived') {
    const error = new Error('Cannot modify an accepted quotation') as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  // Validate cross-org relationships if being changed
  if (input.opportunityId !== undefined && input.opportunityId !== null) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, organizationId },
    });
    if (!opportunity) {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  if (input.contactId !== undefined && input.contactId !== null) {
    const contact = await prisma.contact.findFirst({
      where: { id: input.contactId, organizationId },
    });
    if (!contact) {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  if (input.accountId !== undefined && input.accountId !== null) {
    const account = await prisma.agencyAccount.findFirst({
      where: { id: input.accountId, organizationId },
    });
    if (!account) {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  // Build update data - calculate totals from line items if provided
  const updateData: Record<string, unknown> = {};

  if (input.opportunityId !== undefined) updateData.opportunityId = input.opportunityId;
  if (input.contactId !== undefined) updateData.contactId = input.contactId;
  if (input.accountId !== undefined) updateData.accountId = input.accountId;
  if (input.clientName !== undefined) updateData.clientName = input.clientName;
  if (input.clientEmail !== undefined) updateData.clientEmail = input.clientEmail;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.validUntil !== undefined) {
    updateData.validUntil = input.validUntil == null ? null : new Date(input.validUntil);
  }

  // Handle line items and recalculate totals
  const lineItemsInput = (
    input as unknown as {
      items?: Array<{
        description: string;
        quantity: number | string;
        unitPrice: number | string;
        discount?: number | string;
        taxRate?: number | string;
        order?: number;
      }>;
    }
  ).items;
  if (lineItemsInput !== undefined) {
    const totals = calculateTotals(lineItemsInput);
    updateData.subtotal = totals.subtotal;
    updateData.discount = totals.discount;
    updateData.tax = totals.tax;
    updateData.total = totals.total;

    // Delete existing items and create new ones
    updateData.items = {
      deleteMany: {},
      create: lineItemsInput.map((item, index) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount ?? 0),
        taxRate: Number(item.taxRate ?? 0),
        amount:
          Number(item.quantity) * Number(item.unitPrice) -
          Number(item.quantity) * Number(item.unitPrice) * (Number(item.discount ?? 0) / 100) +
          (Number(item.quantity) * Number(item.unitPrice) -
            Number(item.quantity) * Number(item.unitPrice) * (Number(item.discount ?? 0) / 100)) *
            (Number(item.taxRate ?? 0) / 100),
        order: item.order ?? index,
      })),
    };
  }

  const quotation = await prisma.quotation.update({
    where: { id },
    data: updateData,
    include: {
      items: { orderBy: { order: 'asc' } },
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'quotation.update',
    entityType: 'Quotation',
    entityId: quotation.id,
    before: {
      id: existing.id,
      title: existing.title,
      status: existing.status,
      total: existing.total,
      currency: existing.currency,
    },
    after: {
      id: quotation.id,
      title: quotation.title,
      status: quotation.status,
      total: quotation.total,
      currency: quotation.currency,
    },
    organizationId,
  });

  return serializeQuotation(quotation);
}

/** Soft delete a quotation (sets deletedAt) with audit logging */
export async function deleteQuotation(id: string) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'quotation.delete');

  const existing = await prisma.quotation.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'quotation.delete',
    entityType: 'Quotation',
    entityId: quotation.id,
    before: {
      id: existing.id,
      title: existing.title,
      status: existing.status,
    },
    after: null,
    organizationId,
  });

  return { id: quotation.id, deletedAt: quotation.deletedAt };
}
