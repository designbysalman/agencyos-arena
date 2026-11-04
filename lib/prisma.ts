/**
 * AgencyOS Prisma client (ADR-0005).
 *
 * Phase 0: Local development stub. `prisma generate` could not be run in
 * this sandboxed environment (no network access to Prisma binaries), so
 * @prisma/client cannot be resolved by Turbopack at build time.
 *
 * When `prisma generate` is available (normal development/CI with network
 * access), replace this stub with the real Prisma Client:
 *
 *   import { PrismaClient } from "@prisma/client";
 *
 * The schema is defined in prisma/schema.prisma and must be pushed with
 * `npx prisma db push` before the database can be used.
 */

// Model stub: each model returns an object with methods that return
// sensible defaults for development. Accessing data always returns empty
// arrays or null since there is no real database in this stub.
type ModelMethods = {
  findMany: (args?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  createMany: (data: Record<string, unknown>) => Promise<{ count: number }>;
  findUnique: (where: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  findFirst: (where: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  update: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  updateMany: (data: Record<string, unknown>) => Promise<{ count: number }>;
  delete: (where: Record<string, unknown>) => Promise<Record<string, unknown>>;
  deleteMany: (where?: Record<string, unknown>) => Promise<{ count: number }>;
  count: (where?: Record<string, unknown>) => Promise<number>;
  aggregate: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  groupBy: (args?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
  [key: string]: unknown;
};

function modelStub(name: string): ModelMethods {
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'findMany') return () => Promise.resolve([]);
        if (prop === 'create') return () => Promise.resolve({});
        if (prop === 'createMany') return () => Promise.resolve({ count: 0 });
        if (prop === 'findUnique') return () => Promise.resolve(null);
        if (prop === 'findFirst') return () => Promise.resolve(null);
        if (prop === 'update') return () => Promise.resolve({});
        if (prop === 'updateMany') return () => Promise.resolve({ count: 0 });
        if (prop === 'delete') return () => Promise.resolve({});
        if (prop === 'deleteMany') return () => Promise.resolve({ count: 0 });
        if (prop === 'count') return () => Promise.resolve(0);
        if (prop === 'aggregate') return () => Promise.resolve({});
        if (prop === 'groupBy') return () => Promise.resolve([]);
        throw new Error(
          `PrismaClient stub: model "${name}" method "${String(prop)}" is not available. Run \`npx prisma generate\` to use the real Prisma Client.`
        );
      },
    }
  ) as ModelMethods;
}

class PrismaClient {
  readonly options: Record<string, unknown>;
  private _connected = false;

  constructor(options?: Record<string, unknown>) {
    this.options = options || {};
  }

  async $connect() {
    this._connected = true;
  }

  async $disconnect() {
    this._connected = false;
  }

  async $transaction<T>(): Promise<T> {
    throw new Error(
      'PrismaClient stub: $transaction is not available. Run `npx prisma generate` to use the real Prisma Client.'
    );
  }

  // ---- Core models ----
  get user() {
    return modelStub('user');
  }
  get session() {
    return modelStub('session');
  }
  get account() {
    return modelStub('account');
  }
  get verification() {
    return modelStub('verification');
  }

  // ---- Platform models ----
  get organization() {
    return modelStub('organization');
  }
  get role() {
    return modelStub('role');
  }
  get permission() {
    return modelStub('permission');
  }
  get userRole() {
    return modelStub('userRole');
  }
  get auditLog() {
    return modelStub('auditLog');
  }
  get customField() {
    return modelStub('customField');
  }
  get customFieldValue() {
    return modelStub('customFieldValue');
  }
  get featureFlag() {
    return modelStub('featureFlag');
  }
  get webhookEvent() {
    return modelStub('webhookEvent');
  }
  get fileAsset() {
    return modelStub('fileAsset');
  }

  // ---- CRM models ----
  get contact() {
    return modelStub('contact');
  }
  get accountContact() {
    return modelStub('accountContact');
  }
  get lead() {
    return modelStub('lead');
  }
  get pipeline() {
    return modelStub('pipeline');
  }
  get pipelineStage() {
    return modelStub('pipelineStage');
  }
  get opportunity() {
    return modelStub('opportunity');
  }

  // ---- Finance models ----
  get invoice() {
    return modelStub('invoice');
  }
  get invoiceItem() {
    return modelStub('invoiceItem');
  }
  get payment() {
    return modelStub('payment');
  }
  get estimate() {
    return modelStub('estimate');
  }
  get expenseItem() {
    return modelStub('expenseItem');
  }

  // ---- Projects models ----
  get project() {
    return modelStub('project');
  }
  get projectTemplate() {
    return modelStub('projectTemplate');
  }
  get task() {
    return modelStub('task');
  }
  get milestone() {
    return modelStub('milestone');
  }
  get timeEntry() {
    return modelStub('timeEntry');
  }
  get projectFile() {
    return modelStub('projectFile');
  }
  get changeOrder() {
    return modelStub('changeOrder');
  }

  // ---- Automation models ----
  get workflowRule() {
    return modelStub('workflowRule');
  }
  get workflowExecution() {
    return modelStub('workflowExecution');
  }
  get notification() {
    return modelStub('notification');
  }

  // ---- Documents models ----
  get proposal() {
    return modelStub('proposal');
  }
  get contract() {
    return modelStub('contract');
  }
  get document() {
    return modelStub('document');
  }
}

export const prisma = new PrismaClient();
export default prisma;
