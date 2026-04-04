export const dynamic = 'force-dynamic';

import { getTables, subscribe } from '@/lib/tables-store';

export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Send current tables immediately on connect
      const current = getTables();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(current)}\n\n`));

      // Push future updates
      unsubscribe = subscribe((tables) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(tables)}\n\n`));
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
