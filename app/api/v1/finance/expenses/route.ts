/**
 * AgencyOS Finance Expenses API
 *
 * GET    /api/v1/finance/expenses - List expenses
 * POST   /api/v1/finance/expenses - Create an expense
 */

import { NextResponse } from 'next/server';

import { listExpenses, createExpense } from '@/lib/services/crm/expense-service';
import { expenseCreateSchema } from '@/lib/schemas/crm/expense.schema';

function errorResponse(message: string, status: number, issues?: unknown[]) {
  const body: Record<string, unknown> = { error: message };
  if (issues) body.issues = issues;
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const data = await listExpenses();
    return NextResponse.json(data);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = expenseCreateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid request body', 400, parsed.error.issues);
    }

    const expense = await createExpense(parsed.data);
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      statusCode === 401 ? 'Unauthenticated' : statusCode === 403 ? 'Forbidden' : 'Not found',
      statusCode
    );
  }
}
