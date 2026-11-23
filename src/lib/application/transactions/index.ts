/**
 * Represents a generic transaction abstraction.
 * This decouples the application layer from Prisma specific transaction types.
 */
export interface TransactionClient {
  // Underlying transaction client (e.g., Prisma.TransactionClient)
  [key: string]: any;
}

export interface TransactionManager {
  execute<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
}

export class BaseTransactionManager implements TransactionManager {
  constructor(private readonly prisma: any) {}

  async execute<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      return fn(tx);
    });
  }
}
