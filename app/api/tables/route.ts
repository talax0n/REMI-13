import { getTables, setTables } from '@/lib/tables-store';
import { Table } from '@/app/components/types';

export async function GET() {
  return Response.json(getTables());
}

export async function POST(request: Request) {
  const tables: Table[] = await request.json();
  setTables(tables);
  return Response.json({ ok: true });
}
