import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticated } from '../../_utils/auth';
import { withErrorHandling } from '../../_utils/errors';
import { createLogEntry, logToAuditTrail } from '../../_utils/audit';
import { checkRateLimit, RateLimitPresets } from '../../_utils/rateLimit';

const generateSchema = z.object({
  characterPrompt: z.string().min(10).max(500),
  motionVideoUrl: z.string().url(),
  duration: z.enum(['5', '10']).default('5'),
  platforms: z.array(z.enum(['tiktok', 'instagram', 'youtube'])).min(1),
});

export const POST = withErrorHandling(async (request: Request) => {
  const req = request as NextRequest;

  // Auth check
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Rate limit (AI_SERVICE preset — 10 req/min)
  const rateLimitResult = await checkRateLimit(
    req,
    'video-generate',
    RateLimitPresets.AI_SERVICE,
    'AI_SERVICE'
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many video generation requests. Please try again shortly.' },
      { status: 429 }
    );
  }

  // Validate body
  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { characterPrompt, motionVideoUrl, duration, platforms } = parsed.data;

  // 1. Pollo AI — generate character image
  const polloApiKey = process.env.POLLO_API_KEY;
  if (!polloApiKey) {
    return NextResponse.json({ error: 'POLLO_API_KEY not configured' }, { status: 503 });
  }

  const characterRes = await fetch('https://pollo.ai/api/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${polloApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: characterPrompt }),
  });

  if (!characterRes.ok) {
    const errorText = await characterRes.text();
    return NextResponse.json(
      { error: 'Character image generation failed', details: errorText },
      { status: 502 }
    );
  }

  const { imageUrl } = await characterRes.json();

  // 2. Runway Act-Two — start async video generation
  const runwayApiKey = process.env.RUNWAY_API_KEY;
  if (!runwayApiKey) {
    return NextResponse.json({ error: 'RUNWAY_API_KEY not configured' }, { status: 503 });
  }

  const runwayRes = await fetch('https://api.runwayml.com/v1/act-two', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runwayApiKey}`,
      'X-Runway-Version': '2024-11-06',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      promptImage: imageUrl,
      promptVideo: motionVideoUrl,
      duration: parseInt(duration),
    }),
  });

  if (!runwayRes.ok) {
    const errorText = await runwayRes.text();
    return NextResponse.json(
      { error: 'Runway video generation failed to start', details: errorText },
      { status: 502 }
    );
  }

  const { id: taskId } = await runwayRes.json();

  // 3. Store job in Prisma
  let job;
  try {
    const { default: prisma } = await import('../../../../lib/db/prisma');
    if (!prisma) throw new Error('Prisma client not available');
    job = await (
      prisma as unknown as {
        videoJob: { create: (args: unknown) => Promise<{ id: string; taskId: string }> };
      }
    ).videoJob.create({
      data: {
        taskId,
        status: 'PENDING',
        characterPrompt,
        motionVideoUrl,
        platforms: JSON.stringify(platforms),
        duration: parseInt(duration),
      },
    });
  } catch (dbError) {
    // Log but don't fail — the Runway job is already started
    console.error('[VideoGenerate] Failed to store job in database:', dbError);
    job = { id: 'unknown', taskId };
  }

  // Audit log
  const logEntry = await createLogEntry('VIDEO_GENERATE_STARTED', {
    taskId,
    characterPrompt: characterPrompt.substring(0, 100),
    platforms,
    duration,
  });
  await logToAuditTrail(logEntry);

  return NextResponse.json({
    jobId: job.id,
    taskId,
    status: 'PENDING',
    message: 'Video generation started. Poll /api/video/status/' + taskId + ' for updates.',
  });
});
