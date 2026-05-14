export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getTables, setTables } from '@/lib/tables-store';
import { Table } from '@/app/components/types';

export async function GET() {
  return Response.json(await getTables());
}

export async function POST(request: Request) {
  const tables: Table[] = await request.json();
  await setTables(tables);
  return Response.json({ ok: true });
}
