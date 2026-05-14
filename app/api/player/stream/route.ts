export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { getLeaderboard } from '@/lib/player-store';

const STREAM_DURATION_MS = 50_000;
const POLL_INTERVAL_MS = 2000;

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  let cancelled = false;

  const stream = new ReadableStream({
    start(controller) {
      const onAbort = () => {
        cancelled = true;
      };
      request.signal.addEventListener('abort', onAbort);

      async function poll() {
        while (!cancelled && Date.now() - startedAt < STREAM_DURATION_MS) {
          try {
            const data = await getLeaderboard();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // ignore transient errors
          }
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
        request.signal.removeEventListener('abort', onAbort);
      }
      poll();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
