export const dynamic = 'force-dynamic';

import { getLeaderboard, subscribeToPlayers } from '@/lib/player-store';
import { PlayerScore } from '@/app/player/types';

export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Send current leaderboard immediately on connect
      const current = getLeaderboard();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(current)}\n\n`));

      unsubscribe = subscribeToPlayers((players: PlayerScore[]) => {
        const sorted = [...players]
          .filter((p) => p.status !== 'eliminated')
          .sort((a, b) => b.totalScore - a.totalScore);
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(sorted)}\n\n`));
        } catch {
          unsubscribe?.();
        }
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
