import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { parse } from 'yaml';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const marketingRoot = path.join(repositoryRoot, 'marketing');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(marketingRoot, relativePath), 'utf8'));
}

async function readYaml(relativePath) {
  const source = await readFile(path.join(marketingRoot, relativePath), 'utf8');
  return parse(source);
}

async function yamlFiles(relativeDirectory) {
  const directory = path.join(marketingRoot, relativeDirectory);
  return (await readdir(directory))
    .filter(file => file.endsWith('.yaml'))
    .sort()
    .map(file => path.join(relativeDirectory, file).replaceAll('\\', '/'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validationMessage(ajv, file, errors) {
  return `${file}\n${ajv.errorsText(errors, {
    separator: '\n',
    dataVar: 'campaign',
  })}`;
}

async function main() {
  const contentSchema = await readJson('schemas/content.schema.json');
  const campaignSchema = await readJson('schemas/campaign.schema.json');
  const aiGenerationSchema = await readJson('schemas/ai-generation.schema.json');
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    schemas: [contentSchema, campaignSchema, aiGenerationSchema],
  });
  const validateCampaign = ajv.getSchema(campaignSchema.$id);

  assert(validateCampaign, 'Campaign schema was not registered');

  const channelFiles = await yamlFiles('channels');
  const channels = new Map();

  for (const file of channelFiles) {
    const channel = await readYaml(file);
    assert(channel.schemaVersion === 1, `${file}: unsupported schemaVersion`);
    assert(channel.platformId, `${file}: platformId is required`);
    assert(!channels.has(channel.platformId), `${file}: duplicate platformId`);
    assert(channel.content?.text?.maxChars > 0, `${file}: positive text maxChars is required`);
    assert(
      channel.approval?.humanReviewRequired === true,
      `${file}: human review must be required`
    );
    assert(
      channel.evidence?.required?.includes('providerPostId'),
      `${file}: providerPostId evidence is required`
    );
    assert(
      channel.evidence?.required?.includes('providerPostUrl'),
      `${file}: providerPostUrl evidence is required`
    );
    channels.set(channel.platformId, channel);
  }

  for (const file of await yamlFiles('campaigns')) {
    const campaign = await readYaml(file);
    if (!validateCampaign(campaign)) {
      throw new Error(validationMessage(ajv, file, validateCampaign.errors));
    }

    const contentIds = new Set();
    const variantIds = new Set();
    const trackingTokens = new Set();

    for (const platformId of campaign.platforms) {
      assert(channels.has(platformId), `${file}: unknown platform ${platformId}`);
      const channel = channels.get(platformId);
      assert(
        campaign.attribution.source === channel.attribution.source,
        `${file}: attribution source must match ${platformId} channel rules`
      );
      assert(
        campaign.attribution.medium === channel.attribution.medium,
        `${file}: attribution medium must match ${platformId} channel rules`
      );
    }

    for (const content of campaign.contentItems) {
      assert(
        !contentIds.has(content.contentId),
        `${file}: duplicate contentId ${content.contentId}`
      );
      contentIds.add(content.contentId);

      for (const adaptation of content.adaptations) {
        const channel = channels.get(adaptation.platformId);
        assert(channel, `${file}: unknown adaptation platform ${adaptation.platformId}`);
        assert(
          campaign.platforms.includes(adaptation.platformId),
          `${file}: adaptation platform ${adaptation.platformId} is not enabled`
        );
        assert(
          adaptation.body.length <= channel.content.text.maxChars,
          `${file}: ${adaptation.variantId} exceeds ${channel.displayName} text limit`
        );
        assert(
          adaptation.attribution.utmContent === adaptation.variantId,
          `${file}: utmContent must equal variantId for ${adaptation.variantId}`
        );
        assert(
          !variantIds.has(adaptation.variantId),
          `${file}: duplicate variantId ${adaptation.variantId}`
        );
        assert(
          !trackingTokens.has(adaptation.attribution.trackingToken),
          `${file}: duplicate tracking token ${adaptation.attribution.trackingToken}`
        );
        variantIds.add(adaptation.variantId);
        trackingTokens.add(adaptation.attribution.trackingToken);
      }
    }
  }

  const events = await readYaml('contracts/events.yaml');
  const prohibited = new Set(events.privacy.prohibitedAttributes);
  const eventNames = new Set();
  for (const event of events.events) {
    assert(!eventNames.has(event.name), `events.yaml: duplicate event ${event.name}`);
    eventNames.add(event.name);
    for (const attribute of event.allowedAttributes) {
      assert(
        !prohibited.has(attribute),
        `events.yaml: ${event.name} exposes prohibited ${attribute}`
      );
    }
  }

  const attribution = await readYaml('contracts/attribution.yaml');
  assert(
    attribution.requiredFields.includes('tracking_token'),
    'attribution.yaml: tracking_token is required'
  );

  const governance = await readYaml('contracts/governance.yaml');
  assert(
    governance.deliveryProof.requiredForPublished.includes('providerPostUrl'),
    'governance.yaml: published proof requires providerPostUrl'
  );

  console.log(
    `Validated ${channelFiles.length} channel, ${(await yamlFiles('campaigns')).length} campaign, 3 schema, and 3 governance contract files.`
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
