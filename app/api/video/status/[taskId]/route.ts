import { NextResponse } from 'next/server';
import { isAuthenticated } from '../../../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../../../_utils/audit';

export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { taskId } = await params;

    if (!taskId || taskId.length < 5) {
      return NextResponse.json({ error: 'Invalid taskId' }, { status: 400 });
    }

    // Poll Runway for task status
    const runwayApiKey = process.env.RUNWAY_API_KEY;
    if (!runwayApiKey) {
      return NextResponse.json({ error: 'RUNWAY_API_KEY not configured' }, { status: 503 });
    }

    const runwayRes = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${runwayApiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!runwayRes.ok) {
      const errorText = await runwayRes.text();
      return NextResponse.json(
        { error: 'Failed to check task status', details: errorText },
        { status: 502 }
      );
    }

    const task = await runwayRes.json();

    // Update job in database
    let job = null;
    try {
      const { default: prisma } = await import('../../../../../lib/db/prisma');
      if (!prisma) throw new Error('Prisma client not available');
      const updateData: Record<string, unknown> = { status: task.status };
      if (task.status === 'SUCCEEDED' && task.output?.[0]) {
        updateData.outputVideoUrl = task.output[0];
      }
      if (task.failure) {
        updateData.error = task.failure;
      }

      job = await (
        prisma as unknown as {
          videoJob: {
            update: (args: unknown) => Promise<{
              id?: string;
              platforms?: string;
              characterPrompt?: string;
            }>;
          };
        }
      ).videoJob.update({
        where: { taskId },
        data: updateData,
      });
    } catch (dbError) {
      console.error('[VideoStatus] Failed to update job in database:', dbError);
    }

    // If succeeded, return video URL and pre-built queue payload for human-in-the-loop
    if (task.status === 'SUCCEEDED' && task.output?.[0]) {
      const logEntry = await createLogEntry('VIDEO_GENERATION_SUCCEEDED', {
        taskId,
        outputUrl: task.output[0],
      });
      await logToAuditTrail(logEntry);

      const platforms: string[] = job?.platforms ? JSON.parse(job.platforms) : [];

      return NextResponse.json({
        status: 'SUCCEEDED',
        outputVideoUrl: task.output[0],
        platforms,
        message: 'Video ready! Use POST /api/queue/approve to publish after review.',
        queuePayload: {
          queue: platforms.map((platform: string) => ({
            platform: { name: platform },
            content: {
              id: job?.id || taskId,
              type: 'AI_VIDEO',
              mediaUrls: [task.output[0]],
              text: job?.characterPrompt || '',
            },
          })),
        },
      });
    }

    if (task.status === 'FAILED') {
      const logEntry = await createLogEntry('VIDEO_GENERATION_FAILED', {
        taskId,
        error: task.failure,
      });
      await logToAuditTrail(logEntry);
    }

    return NextResponse.json({
      status: task.status,
      output: task.output || null,
      progress: task.progress || null,
      error: task.failure || null,
    });
  } catch (error) {
    console.error('[VideoStatus] Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
