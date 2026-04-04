import { Table } from '@/app/components/types';
import { query } from './db';

interface TableRow {
  id: string;
  number: number;
  players: Table['players'];
}

export async function getTables(): Promise<Table[]> {
  const rows = await query<TableRow>('SELECT * FROM game_tables ORDER BY number ASC');
  return rows.map((r) => ({ id: r.id, number: r.number, players: r.players }));
}

export async function setTables(tables: Table[]): Promise<void> {
  if (tables.length === 0) {
    await query('DELETE FROM game_tables');
    return;
  }

  const placeholders = tables
    .map((_, i) => {
      const b = i * 3;
      return `($${b + 1}, $${b + 2}::integer, $${b + 3}::jsonb)`;
    })
    .join(', ');

  const params = tables.flatMap((t) => [t.id, t.number, JSON.stringify(t.players)]);

  await query('DELETE FROM game_tables');
  await query(
    `INSERT INTO game_tables (id, number, players) VALUES ${placeholders}`,
    params
  );
}
