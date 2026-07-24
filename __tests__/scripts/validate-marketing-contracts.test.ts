/** @jest-environment node */

import { afterEach, describe, expect, test } from '@jest/globals';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const validatorPath = path.join(process.cwd(), 'scripts', 'validate-marketing-contracts.mjs');
const sourceMarketingRoot = path.join(process.cwd(), 'marketing');
const temporaryRoots: string[] = [];

function createFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'omnipost-marketing-contracts-'));
  temporaryRoots.push(root);
  cpSync(sourceMarketingRoot, root, { recursive: true });
  return root;
}

function campaignPath(root: string) {
  return path.join(root, 'campaigns', 'omnipost-x-live-001.yaml');
}

function updateCampaign(root: string, update: (source: string) => string) {
  const file = campaignPath(root);
  writeFileSync(file, update(readFileSync(file, 'utf8')), 'utf8');
}

function validate(root: string) {
  return spawnSync(process.execPath, [validatorPath], {
    encoding: 'utf8',
    env: { ...process.env, OMNIPOST_MARKETING_ROOT: root },
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('marketing contract validator', () => {
  test('accepts the canonical campaign contracts', () => {
    const result = validate(createFixture());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Validated 1 channel, 1 campaign');
  });

  test('requires delivery evidence for published adaptations', () => {
    const root = createFixture();
    updateCampaign(root, source => source.replace('status: pending', 'status: published'));

    const result = validate(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must have required property 'deliveryEvidence'");
  });

  test('requires approved hashed content before scheduling', () => {
    const root = createFixture();
    updateCampaign(root, source => source.replace('status: pending', 'status: scheduled'));

    const result = validate(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('requires an approved, hashed review before scheduled');
  });

  test('keeps tracking tokens unique across campaign files', () => {
    const root = createFixture();
    const duplicate = readFileSync(campaignPath(root), 'utf8').replace(
      'campaign_omnipost_x_live_001',
      'campaign_omnipost_x_live_002'
    );
    writeFileSync(path.join(root, 'campaigns', 'second-campaign.yaml'), duplicate, 'utf8');

    const result = validate(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('duplicate tracking token mtk_omnipost_x_001');
  });

  test('rejects references to missing AI-generation evidence', () => {
    const root = createFixture();
    updateCampaign(root, source =>
      source.replace('aiGenerationRecords: []', 'aiGenerationRecords:\n  - generation_missing')
    );

    const result = validate(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing AI generation evidence generation_missing');
  });

  test('schema-validates AI-generation evidence documents', () => {
    const root = createFixture();
    const evidenceDirectory = path.join(root, 'evidence', 'ai-generations');
    mkdirSync(evidenceDirectory, { recursive: true });
    writeFileSync(
      path.join(evidenceDirectory, 'generation-invalid.yaml'),
      'generationId: generation_invalid\n',
      'utf8'
    );

    const result = validate(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('evidence/ai-generations/generation-invalid.yaml');
    expect(result.stderr).toContain("must have required property 'contentId'");
  });
});
