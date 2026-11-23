import { Prisma } from '@prisma/client';

/**
 * Type-level recursive mapping of Prisma types for serialized client consumption.
 * Any Prisma.Decimal is mapped to number, while Dates and plain primitives are preserved.
 */
export type SerializedPrisma<T> = T extends Prisma.Decimal
  ? number
  : T extends bigint
  ? number
  : T extends Date
  ? Date
  : T extends (infer U)[]
  ? SerializedPrisma<U>[]
  : T extends readonly (infer U)[]
  ? readonly SerializedPrisma<U>[]
  : T extends Function
  ? never
  : T extends object
  ? { [K in keyof T]: SerializedPrisma<T[K]> }
  : T;

/**
 * Checks if a value is a Prisma Decimal or Decimal.js instance.
 */
export function isDecimal(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return (
    Prisma.Decimal.isDecimal(value) ||
    (typeof (value as any).toNumber === 'function' &&
      typeof (value as any).toFixed === 'function')
  );
}

/**
 * Deeply traverses an object or array and converts all Prisma.Decimal instances into
 * native JavaScript numbers and BigInt instances into numbers to eliminate Next.js RSC boundary serialization errors.
 * 
 * - Converts Prisma.Decimal -> number (via .toNumber())
 * - Converts bigint -> number (via Number(bigint))
 * - Preserves Date objects (safely cloned)
 * - Traverses arrays and nested objects recursively
 * - Guards against circular references using a WeakSet
 */
export function serializePrisma<T>(data: T, seen = new WeakSet()): SerializedPrisma<T> {
  if (data === null || data === undefined) {
    return data as any;
  }

  // Handle BigInt serialization
  if (typeof data === 'bigint') {
    return Number(data) as any;
  }

  // Handle Prisma.Decimal or any Decimal-like object
  if (isDecimal(data) || (typeof data === 'object' && typeof (data as any).toNumber === 'function')) {
    return (data as any).toNumber();
  }

  // Handle Date: Next.js 15 RSC natively supports Date objects, clone to avoid mutations
  if (data instanceof Date) {
    return new Date(data.getTime()) as any;
  }

  // Primitives (string, number, boolean, symbol)
  if (typeof data !== 'object') {
    return data as any;
  }

  // Guard against circular references
  if (seen.has(data)) {
    return data as any;
  }
  seen.add(data);

  // Handle Array
  if (Array.isArray(data)) {
    return data.map((item) => serializePrisma(item, seen)) as any;
  }

  // Handle Plain Objects
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = serializePrisma(value, seen);
  }

  return result as any;
}
