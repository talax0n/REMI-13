export const dynamic = 'force-dynamic';

import { getTables } from '@/lib/tables-store';

export async function GET() {
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    start(controller) {
      async function poll() {
        while (!cancelled) {
          try {
            const data = await getTables();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // ignore transient errors
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
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
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
