# Marketing campaign contracts

This directory is OmniPost's version-controlled campaign control plane. It complements the strategy and decision history in Notion with executable contracts that can be reviewed, tested, and tied to a release.

## What is captured

- `campaigns/` holds canonical objectives, hypotheses, audiences, KPIs, owners, attribution, governance, and content variants.
- `channels/` defines provider-specific limits, authentication scopes, approval rules, evidence, and stop conditions.
- `schemas/` defines the machine-readable campaign, content, and AI-generation evidence contracts.
- `contracts/` defines attribution, privacy-safe events, claims, approval, and delivery-proof rules.

AI output is never treated as approved content by default. When AI assists a variant, record the model route, prompt-pack version, input/output hashes, latency, token usage, estimated cost, reviewer decision, and gate outcomes using `ai-generation.schema.json`. Raw prompts, post bodies, secrets, and personal data do not belong in telemetry.

## Operator flow

1. Create or revise the campaign YAML while its status is `draft`.
2. Run `pnpm marketing:validate`.
3. Review claims and source proof; approve an exact content hash.
4. Publish one manual smoke post.
5. Record provider post ID, URL, publish time, and audit event before calling it published.
6. Continue or stop using the declared KPI guardrails and channel stop conditions.

The initial file, `campaigns/omnipost-x-live-001.yaml`, deliberately mirrors the existing runtime seed. A Jest contract test prevents the two representations from drifting.
