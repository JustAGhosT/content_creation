/**
 * OmniPost Creative Studio - Real-Time Render Streaming Engine
 * Implements SSE event pipeline for live Mill render progress.
 */

import { millRenderer } from './mill-adapter';
import { RenderRequest, RenderResult } from './contracts';

export type RenderStreamStage =
  | 'queued'
  | 'validating_inputs'
  | 'resolving_assets'
  | 'rasterizing_canvas'
  | 'computing_proofs'
  | 'completed'
  | 'failed';

export interface RenderStreamEvent {
  stage: RenderStreamStage;
  progress: number; // 0 - 100
  message: string;
  timestamp: string;
  result?: RenderResult;
  error?: {
    code: string;
    message: string;
  };
}

export interface StreamCallbacks {
  onEvent: (event: RenderStreamEvent) => void;
  onError?: (err: Error) => void;
  onDone?: () => void;
}

/**
 * Executes a simulated or live Mill render job with progressive SSE step notifications.
 */
export async function executeStreamingRender(
  request: RenderRequest,
  callbacks: StreamCallbacks,
  stepDelayMs: number = 80
): Promise<RenderResult> {
  const emit = (
    stage: RenderStreamStage,
    progress: number,
    message: string,
    extra?: Partial<RenderStreamEvent>
  ) => {
    callbacks.onEvent({
      stage,
      progress,
      message,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  };

  // Step 1: Queued & Validating Inputs
  emit('queued', 10, 'Render job queued in Mill worker pool...');
  if (stepDelayMs > 0) await new Promise(r => setTimeout(r, stepDelayMs));

  emit('validating_inputs', 25, 'Validating envelope schema and canonical input hash...');
  if (stepDelayMs > 0) await new Promise(r => setTimeout(r, stepDelayMs));

  // Step 2: Resolving Assets
  emit('resolving_assets', 45, 'Resolving verified asset hashes and tenant access grants...');
  if (stepDelayMs > 0) await new Promise(r => setTimeout(r, stepDelayMs));

  // Step 3: Rasterizing Canvas with Mill
  emit(
    'rasterizing_canvas',
    70,
    `Executing deterministic format conversion for ${request.target.platform} (${request.target.mediaType})...`
  );
  if (stepDelayMs > 0) await new Promise(r => setTimeout(r, stepDelayMs));

  // Step 4: Computing Cryptographic Proofs & Calling Renderer
  emit('computing_proofs', 88, 'Computing SHA-256 deterministic artifact fingerprint...');
  const result = await millRenderer.render(request);

  if (result.status === 'succeeded') {
    emit('completed', 100, 'Deterministic rendering and asset verification completed.', {
      result,
    });
    callbacks.onDone?.();
    return result;
  } else {
    emit('failed', 100, result.errorMessage || 'Rendering failed in Mill engine.', {
      result,
      error: {
        code: result.errorCode || 'RENDER_FAILED',
        message: result.errorMessage || 'Unknown rendering error',
      },
    });
    callbacks.onDone?.();
    return result;
  }
}
