export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { deletePlayer, deletePlayers } from '@/lib/player-store';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  let bodyIds: string[] | undefined;
  if (request.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = await request.json();
      if (Array.isArray(body?.ids)) {
        bodyIds = body.ids.filter((v: unknown): v is string => typeof v === 'string');
      }
    } catch {
      // ignore parse errors; fall through to id param
    }
  }

  if (bodyIds && bodyIds.length > 0) {
    const deleted = await deletePlayers(bodyIds);
    return Response.json({ ok: true, deleted });
  }

  if (!id) {
    return Response.json({ error: 'Missing player id' }, { status: 400 });
  }

  await deletePlayer(id);
  return Response.json({ ok: true, deleted: 1 });
}
