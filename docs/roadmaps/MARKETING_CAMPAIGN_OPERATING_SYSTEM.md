# OmniPost Marketing and Campaign Operating-System Roadmap

- **Status:** Approved direction
- **Last updated:** 2026-07-24
- **Horizon:** Controlled X evidence pilot through measured defensibility proof
- **Canonical MVP constraint:** One reliable workflow from content input
  through AI adaptation, human approval, verified publishing, visible result,
  and audit evidence.

## Purpose

This roadmap defines how OmniPost will turn campaign strategy into traceable
execution and evidence. It does not replace:

- [the alpha launch plan](../ALPHA_LAUNCH_PLAN.md), which describes the wider
  product launch;
- [the X campaign go-live runbook](../runbooks/X_CAMPAIGN_GO_LIVE.md), which is
  the operator procedure for the first controlled X post; or
- Baton, which owns delivery status, dependencies, and closeout evidence.

The roadmap is the canonical sequencing and governance document for marketing
campaign capabilities.

## Product Decision

OmniPost will not pursue feature-for-feature parity with broad social suites
before the launch gate passes. The initial product wedge is:

> AI-assisted, platform-specific publishing with human approval and verifiable
> campaign evidence for creators and small teams.

The order is:

1. prove exactly one controlled X publish;
2. establish versioned campaign and telemetry contracts;
3. persist campaign, approval, account, queue, and result state;
4. make campaign attribution and operational evidence durable;
5. evaluate AI routes using first-party acceptance and quality evidence; and
6. reuse the proven contracts for a LinkedIn pilot;
7. accumulate a consented, privacy-safe outcome corpus;
8. turn that corpus into measurably better decisions;
9. embed evidence-grade workflows deeply enough to create earned switching
   costs;
10. establish a repeatable vertical distribution and extension ecosystem; and
11. pass a counterfactual clone-and-retention review before claiming a moat.

Facebook, Instagram, TikTok, broad listening, a unified inbox, autonomous
posting, and CRM-grade revenue attribution remain deferred until these gates
pass.

## Source-of-Truth Boundaries

| System                          | Owns                                                                                                                                    | Must not own                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Notion                          | Brand, audiences, message matrix, claims, campaign briefs, approvals, decisions, retrospectives                                         | Live queue state, provider credentials, mutable runtime truth |
| Git                             | Schemas, validation, prompt packs, channel rules, telemetry contracts, workbook definitions, approved campaign snapshots                | Secrets, live provider state, mutable performance data        |
| OmniPost database and telemetry | Campaign versions, content versions, adaptations, approvals, accounts, publish attempts, provider IDs, attribution events, measurements | Informal strategy discussion or secret values in analytics    |
| Baton                           | Delivery owner, dependency graph, blockers, evidence requirements, closeout, residual risk                                              | Campaign content or credentials                               |

All four systems must use the same stable `campaignId`, `contentId`,
`variantId`, and opaque `campaignToken`. A queued or published item must also
reference the immutable campaign/content version and content hash that was
approved.

## Operating Principles

1. **Human approval is server-authoritative.** UI state alone cannot authorize
   a publish.
2. **Queued content is immutable.** Later Notion or draft edits cannot alter
   already-approved work.
3. **Publishing is idempotent.** Retrying an unknown result must not create a
   duplicate post.
4. **Evidence is captured at the source.** Provider IDs, URLs, attempt state,
   timestamps, errors, and deployment version are persisted when known.
5. **Telemetry is allow-listed.** Store bounded identifiers and classifications
   in telemetry, not secrets, full copy, prompts, raw tokens, or unnecessary
   personal data.
6. **Attribution uses standard fields.** Use stable lowercase values for
   `utm_id`, `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content`, plus
   an opaque OmniPost `mtk` token.
7. **AI evidence is first-party.** External model reputation is only a prior;
   production choices depend on OmniPost acceptance, edit, quality, cost,
   latency, legal, and policy evidence.
8. **One platform earns the next.** LinkedIn work begins only after the X gate
   named below passes.

## Current Baseline

As of 2026-07-24:

- PR #172 is deployed and the X adapter uses `POST /2/tweets`.
- The draft **OmniPost on X - First Live Campaign** contains three X-only posts.
- The live service is fail-closed because no X user-context credential is
  configured.
- Baton task `7e1feab6-a668-4c18-b54d-691eddcd243f` tracks the controlled X
  smoke.
- Campaign state is still local to the browser.
- The queue is memory-backed and has no recurring Azure trigger.
- The current analytics event store is memory-backed.
- The first path does not yet provide multi-account OAuth refresh and
  revocation handling.

These constraints allow a staffed evidence pilot. They do not constitute a
production-grade multi-account publishing service.

## Roadmap

### Gate 0 — Controlled X Evidence Pilot

- **Horizon:** Now
- **Launch class:** Tier 3 controlled evidence launch
- **Owner:** Campaign owner plus technical operator
- **Operator procedure:** [X campaign go-live runbook](../runbooks/X_CAMPAIGN_GO_LIVE.md)

Deliver:

- account owner confirms the OmniPost X account and approves post 1;
- an X OAuth 2.0 user-context token has only the required scopes;
- the credential is stored through Key Vault and resolves in App Service;
- one job is queued and the protected processor is invoked once;
- the public post, provider ID, URL, deployment SHA, publish time, and scheduler
  result are captured in Baton; and
- the operator watches for delayed duplicates and errors.

Exit gate:

- exactly one approved post is public on the correct X account;
- the returned provider ID and public URL reconcile;
- there are zero duplicates;
- the scheduler result is successful;
- evidence is complete; and
- no credential or secret URI appears in evidence.

Stop on a wrong-account post, 401/403 response, duplicate, altered copy,
unresolved secret reference, unknown job state, or incomplete audit evidence.

Posts 2 and 3 remain gated until post 1 passes. They are then reviewed and
scheduled at least 24 hours apart, with a seven-day observation window.

### Gate 1 — Campaign and Evidence Contracts

- **Horizon:** Now
- **Primary teams:** Marketing, backend, data, security, docs

Deliver:

- `marketing/schemas/campaign.schema.json`;
- `marketing/schemas/content.schema.json`;
- `marketing/schemas/ai-generation.schema.json`;
- `marketing/channels/x.yaml`;
- `marketing/campaigns/omnipost-x-live-001.yaml`;
- a versioned event and attribution dictionary;
- claim, asset-provenance, approval, and privacy rules; and
- CI validation for required fields, stable IDs, platform limits, attribution
  naming, approvals, and referenced proof.

Exit gate:

- the X campaign validates from a clean checkout;
- every content item has an owner, reviewer, audience, objective, CTA,
  platform, version, and approval state;
- attribution IDs are unique and consistently named;
- prohibited telemetry fields are documented and tested; and
- the Notion, Git, and Baton records reference the same campaign ID.

### Gate 2 — Durable Campaign and Approval State

- **Horizon:** Next
- **Primary teams:** Data, backend, security, frontend

Deliver:

- campaign and content version records;
- immutable approval records;
- attribution-link records;
- AI-generation records;
- publish-attempt records;
- campaign-decision records;
- import/reconciliation for the approved Git campaign snapshot; and
- migration from browser-local campaign truth.

Exit gate:

- a reload or app restart preserves campaign and approval state;
- queued work references the approved version and content hash;
- unauthorized or stale versions fail closed;
- changes create a new version instead of rewriting the approved record; and
- audit queries can reconstruct who approved what and what was queued.

### Gate 3 — Production-Grade X Account and Scheduler Path

- **Horizon:** Next
- **Primary teams:** Backend, security, infra, devops

Deliver:

- encrypted per-account token storage;
- OAuth connection, refresh, expiry, revoke, and reconnect handling;
- a durable queue with leases and idempotency keys;
- a recurring Azure processor trigger;
- classified retry and dead-letter behavior;
- account/platform rate-limit enforcement; and
- provider reconciliation for unknown results.

Exit gate:

- app restarts do not lose or duplicate work;
- expired and revoked credentials fail safely with visible recovery actions;
- a retry cannot create a second provider post;
- operators can reconcile a provider result without inspecting secrets; and
- controlled X publishing no longer requires a manually provisioned static
  token or one-off processor invocation.

### Gate 4 — Attribution and Campaign Workbook

- **Horizon:** Next
- **Primary teams:** Backend, data, infra, marketing

Deliver the durable event family:

- `campaign_created`;
- `content_approved`;
- `publish_job_queued`;
- `publish_attempted`;
- `publish_succeeded`;
- `publish_failed`;
- `landing_view`;
- `cta_clicked`;
- `signup_started`;
- `signup_completed`; and
- `platform_connected`.

Common bounded dimensions:

- `campaignId`;
- `campaignVersion`;
- `contentId`;
- `variantId`;
- `platform`;
- `publishAttemptId`;
- `providerPostId`;
- `campaignToken`;
- `utmSource`;
- `utmMedium`;
- `utmCampaign`;
- `utmContent`; and
- `landingPage`.

Deliver a workbook with:

1. campaign preflight completeness;
2. approval and scheduling funnel;
3. publish success, failure, retry, and latency;
4. exact post/provider drill-down;
5. attribution by campaign, content, variant, and platform;
6. landing-to-signup-to-first-publish conversion;
7. tagging and missing-data cleanup;
8. credential, rate-limit, and platform health; and
9. experiment gate and decision history.

Exit gate:

- an operator can trace one approved campaign item through publish and available
  conversion events;
- workbook totals reconcile with runtime records;
- missing or malformed campaign tags are visible;
- telemetry contains only approved fields; and
- campaign decisions cite the workbook evidence used.

### Gate 5 — AI Generation Provenance and Adjudication

- **Horizon:** Later
- **Primary teams:** Marketing, backend, data, security

Deliver:

- versioned prompt packs;
- provider, model, and route capture;
- input/output hashes;
- token usage, cost, and latency;
- human accept, edit, reject, and reason capture;
- brand, claim, platform-policy, legal, and data-use gates;
- first-party quality scorecards by task and platform; and
- drift and incident monitoring.

Exit gate:

- a reviewer can reproduce the context and version used for an adaptation
  without exposing hidden reasoning;
- an AI route cannot graduate on reputation alone;
- provider decisions use first-party acceptance and quality evidence;
- costs remain visible but do not override legal or policy gates; and
- generated assets retain provenance metadata, with C2PA support evaluated for
  image/video work.

### Gate 6 — LinkedIn Pilot

- **Horizon:** Later
- **Primary teams:** Backend, marketing, security, testing

Entry criteria:

- Gates 1 through 5 are complete;
- the X observation window has a documented decision;
- no unresolved duplicate, approval, credential, or attribution defect remains;
  and
- LinkedIn application access and current API constraints are verified.

Deliver:

- LinkedIn channel rules and platform-specific content validation;
- one campaign adapted from the approved source rather than copied verbatim;
- the same approval, version, idempotency, attribution, and workbook evidence
  used for X; and
- an X-versus-LinkedIn adaptation and outcome comparison.

Exit gate:

- one approved LinkedIn post publishes exactly once;
- platform-specific copy and CTA choices are visible;
- provider and attribution evidence reconcile; and
- the retrospective decides whether to expand, revise, or stop.

### Gate 7 — Design-Partner Evidence Network

- **Horizon:** Post-pilot
- **Primary teams:** Product, marketing, data, security, customer success

Entry criteria:

- Gates 1 through 6 are complete;
- evidence collection, retention, consent, export, and deletion rules are
  documented; and
- design partners agree to the exact data-use boundary.

Deliver:

- a focused design-partner program for one beachhead segment;
- tenant-isolated records for approvals, edits, publish outcomes, attribution,
  incidents, and campaign decisions;
- explicit consent and purpose metadata for any aggregate learning signal;
- data-quality, deletion, export, and tenant-boundary controls; and
- a cohort dashboard that separates usage volume from evidence completeness.

Exit gate:

- at least five active design-partner organizations complete two governed
  campaigns each;
- at least 90% of their published adaptations have complete approval,
  provider, attribution, and decision evidence;
- deletion/export and cross-tenant isolation tests pass; and
- interviews confirm one beachhead problem worth paying to solve.

### Gate 8 — Compounding Outcome Intelligence

- **Horizon:** Post-pilot
- **Primary teams:** Data, AI, backend, security, marketing

Entry criteria:

- Gate 7 evidence quality passes;
- no raw customer content, credentials, or personal data is required for
  aggregate learning; and
- each recommendation can cite its evidence class and confidence.

Deliver:

- tenant-private brand and approval memory;
- privacy-safe aggregate benchmarks where consent permits;
- recommendation and routing evaluations using acceptance, edit, quality,
  outcome, cost, and latency evidence;
- holdouts and rollback controls; and
- explanations that distinguish observed evidence from model inference.

Exit gate:

- a prospective holdout shows at least a 10% relative improvement in one
  declared primary measure such as first-pass acceptance or edit effort;
- brand, claim, policy, privacy, and publish-reliability guardrails do not
  regress;
- the result reproduces across at least three design-partner organizations; and
- disabling the learned signal returns behavior to the documented baseline.

### Gate 9 — Evidence-Grade Workflow Embeddedness

- **Horizon:** Post-pilot
- **Primary teams:** Product, frontend, backend, security, integrations

Entry criteria:

- Gate 8 produces a repeatable benefit;
- customers identify existing approval, reporting, and audit systems that
  OmniPost must complement; and
- portability remains a product requirement rather than artificial lock-in.

Deliver:

- reusable brand, approval, claim, and channel policy packs;
- organization roles, client workspaces, review escalation, and evidence
  retention controls;
- durable integrations and APIs for the beachhead workflow;
- complete campaign-history, evidence, and policy export; and
- migration tools that preserve lineage when customers import existing work.

Exit gate:

- at least 60% of the Gate 7 cohort remains active after 90 days;
- at least 70% of retained organizations run a third governed campaign;
- at least three organizations use a policy pack plus one external integration
  in recurring operation; and
- export/re-import reconstructs the approval and publish audit trail without
  vendor-only fields.

### Gate 10 — Vertical Distribution and Extension Flywheel

- **Horizon:** Post-pilot
- **Primary teams:** Product marketing, partnerships, developer experience,
  security

Entry criteria:

- Gate 9 identifies one retained beachhead segment;
- external claims are backed by customer-approved evidence; and
- adapter and integration security boundaries are documented.

Deliver:

- segment-specific positioning, onboarding, templates, proof, and pricing;
- customer-approved case studies tied to measured operational or campaign
  outcomes;
- a versioned adapter/integration SDK with certification tests;
- a partner and contributor motion that brings qualified organizations into the
  evidence network; and
- attribution from partner or ecosystem entry through retained usage.

Exit gate:

- one repeatable channel produces at least 30% of qualified design-partner or
  pilot opportunities for two consecutive measurement periods;
- at least three external integrations or adapters pass certification and are
  used in live governed workflows;
- the beachhead cohort converts to paid or signed paid-pilot commitments at a
  predeclared threshold; and
- acquisition claims reconcile with CRM and product evidence.

### Gate 11 — Defensibility Review

- **Horizon:** Decision gate
- **Primary teams:** Product, strategy, finance, security, data

Entry criteria:

- Gates 7 through 10 have completed measurement windows; and
- retention, willingness-to-pay, recommendation lift, evidence quality, and
  distribution data are available.

Deliver:

- a counterfactual review of what a funded competitor could copy in 3, 6, and
  12 months;
- an asset inventory separating open-source code from customer trust, data,
  integrations, workflow history, and distribution advantages;
- customer interviews testing replacement cost and willingness to switch;
- unit economics and concentration risk; and
- a continue, narrow, partner, open-source, or stop decision.

Exit gate:

- no moat claim is made unless outcome intelligence shows reproducible lift,
  the retained cohort shows recurring paid use, and at least one acquisition or
  ecosystem channel compounds;
- the board-level claim names the specific protected advantage and evidence,
  not “AI,” “data,” or feature count in the abstract; and
- failed criteria produce an explicit remediation or stop decision rather than
  a ceremonial pass.

## Success Measures

### Operational measures

- exactly-once publish rate;
- duplicate-post count;
- publish success/failure rate;
- queue-to-provider latency;
- reconciliation completeness;
- approval-to-publish trace completeness; and
- credential-expiry recovery rate.

### Campaign measures

- impressions and reach where the provider supplies them;
- engagement rate;
- profile visits;
- landing views and CTA clicks;
- attributed signup starts and completions; and
- first-platform connection and first-publish conversion.

The first campaign establishes a baseline. Do not invent acquisition or
engagement targets before baseline evidence exists.

### AI measures

- accepted without edit;
- accepted after edit;
- rejected;
- edit distance or classified edit reason;
- brand/claim/policy failure rate;
- cost per approved adaptation; and
- latency per approved adaptation.

### Defensibility measures

- evidence-complete campaigns per retained organization;
- 30-, 60-, and 90-day organization retention;
- repeat governed campaigns per organization;
- first-pass acceptance and edit-effort lift against holdouts;
- policy-pack and integration reuse;
- partner/ecosystem share of qualified opportunities;
- paid-pilot conversion and willingness-to-pay; and
- export/re-import audit reconstruction.

## Delivery Slices

Keep changes reviewable and independently verifiable:

1. documentation, schemas, X campaign specification, and validation;
2. persisted versions, approvals, attribution links, and import;
3. durable account/OAuth and scheduler infrastructure;
4. durable event ingestion, attribution, queries, and workbook;
5. AI provenance and quality adjudication; and
6. LinkedIn pilot;
7. design-partner evidence network;
8. compounding outcome intelligence;
9. evidence-grade workflow embeddedness;
10. vertical distribution and extension flywheel; and
11. defensibility review.

Each slice requires `pnpm check-all`, a separate PR, deployment verification
when runtime behavior changes, and a Baton closeout containing changed files,
tests, deployment evidence, residual risk, and next action.

## Notion Operating Cadence

- **Before work:** verify the current campaign brief, claims, owner, reviewer,
  channel rules, and decision gate.
- **Before publish:** freeze the approved snapshot and reference its Git version
  and content hash.
- **During the campaign:** runtime systems own state; do not edit Notion to
  rewrite what was published.
- **Weekly:** reconcile campaign links, tagging quality, publish outcomes,
  attribution, and open incidents.
- **At the decision gate:** record continue, revise, pause, or stop with cited
  evidence.
- **Quarterly:** re-check competitor capability and pricing claims before using
  them externally.

## Decision Log

| Date       | Decision                                                                              | Reason                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2026-07-24 | Use X as the first controlled live path                                               | The adapter, starter campaign, deployment, and operator runbook already exist; changing platforms would delay evidence |
| 2026-07-24 | Separate the smoke gate from production readiness                                     | The current local campaign and memory-backed queue can prove one staffed publish but cannot support broad rollout      |
| 2026-07-24 | Use Notion, Git, runtime, and Baton as distinct sources of truth joined by stable IDs | This preserves human governance, versioned contracts, live execution truth, and accountable delivery                   |
| 2026-07-24 | Defer LinkedIn until durable campaign and measurement gates pass                      | The second platform should validate reuse of the operating system rather than add another one-off integration          |
| 2026-07-25 | Treat Gates 0–6 as moat prerequisites, not proof of a moat                            | Defensibility requires retained paid use, proprietary evidence lift, embedded workflows, and compounding distribution  |

## Immediate Next Actions

1. Complete the external account-authorization steps in the X runbook and run
   Gate 0 when the account owner is present.
2. Deliver Gate 1 as the next repository PR.
3. Use the approved `campaign_omnipost_x_live_001` campaign ID in Notion, Git,
   runtime migration, telemetry, and Baton; use `omnipost-x-live-001` only as
   its human-readable slug.
4. Start Gate 2 only after the Gate 1 schemas and validation are reviewed.
5. Do not un-gate another provider until its named entry criteria pass.
6. Recruit design partners only after the evidence boundary and deletion/export
   controls are reviewable.
7. Do not use “defensible moat” externally until Gate 11 passes.
