/**
 * Governed CoilTrace Creative Pilot Acceptance Test
 * Implements Baton Task 99b1d7e3 acceptance verification.
 */

import { CreativeComposerService } from '@/lib/creative/composer-service';
import { MillRendererAdapter } from '@/lib/creative/renderer/mill-adapter';
import { RenderJobManager } from '@/lib/creative/renderer/render-job-manager';
import { executeCoilTracePilot } from '@/lib/creative/pilot/coiltrace-pilot';

describe('CoilTrace Governed Creative Pilot (Task 99b1d7e3)', () => {
  let composer: CreativeComposerService;
  let jobManager: RenderJobManager;
  let renderer: MillRendererAdapter;

  beforeEach(() => {
    composer = new CreativeComposerService();
    jobManager = new RenderJobManager();
    renderer = new MillRendererAdapter();
  });

  it('successfully executes end-to-end CoilTrace flyer creation, human review, Mill render, and audit capture', async () => {
    const result = await executeCoilTracePilot(composer, jobManager, renderer, 'operator-jurie');

    // 1. Verify approved variant properties
    expect(result.variant.state).toBe('approved');
    expect(result.variant.canonicalInputHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.approvalId).toContain('appr-crv');

    // 2. Verify deterministic Mill render execution
    expect(result.renderJob.status).toBe('succeeded');
    expect(result.artifactHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.artifactStorageReference).toContain('artifacts/creative/');

    // 3. Verify complete, non-leaking audit trail
    expect(result.auditTrail.length).toBe(3);
    const actions = result.auditTrail.map(e => e.action);
    expect(actions).toEqual([
      'creative_variant.versioned',
      'creative_variant.approved',
      'render.succeeded',
    ]);

    for (const event of result.auditTrail) {
      const serialized = JSON.stringify(event);
      expect(serialized).not.toContain('grant-token');
      expect(serialized).not.toContain('secret');
      expect(serialized).not.toContain('password');
    }
  });

  it('re-uses identical artifact on duplicate pilot submission without re-executing Mill', async () => {
    const run1 = await executeCoilTracePilot(composer, jobManager, renderer, 'operator-jurie');
    const run2 = await executeCoilTracePilot(composer, jobManager, renderer, 'operator-jurie');

    expect(run2.artifactHash).toBe(run1.artifactHash);
  });
});
