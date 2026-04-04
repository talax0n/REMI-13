import { Table } from '@/app/components/types';

// In-memory store for current table assignments
let currentTables: Table[] = [];
const subscribers = new Set<(tables: Table[]) => void>();

export function getTables(): Table[] {
  return currentTables;
}

export function setTables(tables: Table[]): void {
  currentTables = tables;
  subscribers.forEach((fn) => {
    try {
      fn(tables);
    } catch {
      subscribers.delete(fn);
    }
  });
}

export function subscribe(fn: (tables: Table[]) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
