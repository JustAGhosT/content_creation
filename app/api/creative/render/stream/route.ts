/**
 * SSE Streaming API Route for Real-Time Mill Render Progress
 * POST /api/creative/render/stream
 */

import { NextRequest } from 'next/server';
import { renderRequestSchema } from '@/lib/creative/renderer/contracts';
import { executeStreamingRender } from '@/lib/creative/renderer/stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = renderRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid render request envelope',
          details: parseResult.error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const renderPayload = parseResult.data;

    // Create a TransformStream for SSE
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const writeEvent = async (data: Record<string, unknown>) => {
      const payload = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    };

    // Execute streaming pipeline asynchronously
    (async () => {
      try {
        await executeStreamingRender(renderPayload, {
          onEvent: async evt => {
            await writeEvent(evt as unknown as Record<string, unknown>);
          },
          onDone: async () => {
            await writer.close();
          },
          onError: async err => {
            await writeEvent({
              stage: 'failed',
              progress: 100,
              message: err.message,
              timestamp: new Date().toISOString(),
            });
            await writer.close();
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Render pipeline failure';
        await writeEvent({
          stage: 'failed',
          progress: 100,
          message,
          timestamp: new Date().toISOString(),
        });
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
