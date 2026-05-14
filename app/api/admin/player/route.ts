export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { deletePlayer } from '@/lib/player-store';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Missing player id' }, { status: 400 });
  }

  await deletePlayer(id);
  return Response.json({ ok: true });
}
