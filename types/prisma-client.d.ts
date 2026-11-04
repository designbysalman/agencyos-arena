// Type augmentation for @prisma/client.
//
// In CI, `npx prisma generate` creates the real PrismaClient type declarations
// inside node_modules/@prisma/client/.prisma/client/. This file provides
// minimal type declarations for environments where `prisma generate` cannot
// run (e.g., sandboxed environments without network access to Prisma binaries).
//
// This uses TypeScript module augmentation to add PrismaClient to the
// @prisma/client module. It is merged with any existing declarations.

declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: { log?: string[]; datasources?: { db?: { url: string } } });
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction<R>(fn: (prisma: PrismaClient) => Promise<R>): Promise<R>;
    $transaction<R>(queries: readonly Promise<unknown>[]): Promise<R>;
    $extends<R extends Record<string, unknown>>(extensions: R): PrismaClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
}
