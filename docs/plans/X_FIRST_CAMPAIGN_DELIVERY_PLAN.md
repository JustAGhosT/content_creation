# X-First Campaign Delivery Plan

- **Roadmap:** [Marketing and Campaign Operating-System Roadmap](../roadmaps/MARKETING_CAMPAIGN_OPERATING_SYSTEM.md)
- **Operator runbook:** [X Campaign Go-Live Runbook](../runbooks/X_CAMPAIGN_GO_LIVE.md)
- **Baton live-publish task:** `7e1feab6-a668-4c18-b54d-691eddcd243f`
- **Starter campaign ID:** `campaign_omnipost_x_live_001`
- **Starter campaign slug:** `omnipost-x-live-001`

## Outcome

Prove and then productionize this chain:

```text
campaign brief
  -> versioned source content
  -> X-specific AI adaptation
  -> human approval
  -> immutable queued version
  -> exactly-once X publish
  -> provider reconciliation
  -> attribution and workbook evidence
  -> continue, revise, pause, or stop decision
```

## Workstreams

| Workstream        | Primary ownership                  | Deliverable                                                        | Closeout evidence                                                                 |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Controlled smoke  | Marketing, backend, security       | One approved public X post                                         | Public URL, provider ID, UTC time, deployment SHA, scheduler result, no duplicate |
| Contracts         | Marketing, backend, data, security | Campaign/content/AI schemas, X rules, event dictionary             | Clean validation, tests, linked Notion and Baton IDs                              |
| Persistence       | Data, backend, frontend            | Versioned campaign, approval, attribution, AI, and publish records | Reload/restart persistence and audit reconstruction                               |
| Account and queue | Backend, security, infra           | OAuth lifecycle, encrypted tokens, durable idempotent scheduler    | Restart, expiry, retry, revoke, and reconciliation tests                          |
| Measurement       | Backend, data, infra, marketing    | Durable events, attribution capture, workbook                      | Runtime/workbook reconciliation and privacy tests                                 |
| AI evidence       | Marketing, backend, data           | Prompt/model provenance and adjudication                           | Acceptance, edit, quality, cost, latency, and failure evidence                    |
| LinkedIn reuse    | Backend, marketing, testing        | First governed second-platform pilot                               | Platform-specific adaptation and exactly-once evidence                            |

## Planned Pull Requests

### PR A — Campaign Contract Foundation

Scope:

- add the `marketing/` schema and campaign structure;
- encode campaign ID `campaign_omnipost_x_live_001` with slug
  `omnipost-x-live-001`;
- document UTM and event naming;
- validate platform length, required approvals, stable IDs, proof references,
  attribution fields, and prohibited telemetry; and
- add repository documentation links.

Verification:

- schema validation tests;
- campaign fixture tests;
- prohibited-field tests;
- `pnpm check-all`.

No runtime migration is included.

### PR B — Persist Campaign Versions and Approvals

Scope:

- add version, approval, attribution-link, AI-generation, publish-attempt, and
  decision records;
- import the approved Git campaign snapshot;
- migrate the current starter campaign without replacing unrelated user data;
- expose explicit approval and stale-version errors; and
- remove browser-local state as campaign authority.

Verification:

- Prisma migration and data-access tests;
- authorization and stale-version tests;
- reload/restart smoke;
- `pnpm check-all`;
- deployed health and authenticated campaign smoke.

### PR C1 — OAuth Account Lifecycle

Scope:

- X account connection and callback;
- least-privilege scopes;
- encrypted token storage;
- refresh, expiry, revoke, and reconnect;
- visible configuration status; and
- secret-safe logging.

Verification:

- callback and state/PKCE tests;
- token encryption/redaction tests;
- expiry and revoke tests;
- authenticated production configuration smoke.

### PR C2 — Durable Exactly-Once Scheduler

Scope:

- persistent jobs;
- job lease and idempotency key;
- recurring Azure trigger;
- retry classification and dead-letter state;
- unknown-result reconciliation; and
- provider rate-limit handling.

Verification:

- concurrent processor test;
- duplicate-retry test;
- restart recovery test;
- provider timeout/unknown-result test;
- controlled production scheduler smoke.

### PR D — Attribution and Campaign Workbook

Scope:

- durable event ingestion;
- `utm_*` and opaque `mtk` capture;
- publish and conversion event contracts;
- App Insights queries and workbook;
- tagging-quality panel;
- exact post/provider drill-down; and
- documented decision-log procedure.

Verification:

- exact allow-list tests;
- campaign-token propagation tests;
- ingestion/retry tests;
- workbook queries against known evidence;
- runtime-to-workbook reconciliation.

### PR E — AI Provenance and Quality

Scope:

- prompt-pack versioning;
- provider/model/route and input/output hashes;
- acceptance and edit reasons;
- cost and latency;
- brand, claim, policy, legal, and data gates; and
- first-party adjudication views.

Verification:

- no prompt/output leakage into analytics;
- accept/edit/reject workflow tests;
- provider-gate tests;
- cost/latency aggregation checks.

### PR F — LinkedIn Pilot

Entry criteria:

- PRs A through E are deployed and verified;
- the X campaign has a recorded decision;
- no unresolved duplicate, credential, approval, or attribution issue remains;
  and
- current LinkedIn developer access is confirmed.

Scope:

- LinkedIn platform rules and adapter;
- one governed platform-specific adaptation;
- the existing version, approval, publish, attribution, and workbook contracts;
  and
- a cross-platform retrospective.

### PR G — Design-Partner Evidence Network

Scope:

- consented design-partner cohort and beachhead selection;
- tenant-isolated evidence completeness and retention controls;
- deletion/export workflows; and
- repeat-campaign and evidence-quality reporting.

Verification:

- tenant-boundary and deletion tests;
- five organizations complete two governed campaigns;
- at least 90% evidence completeness; and
- customer interviews and willingness-to-pay evidence.

### PR H — Outcome Intelligence

Scope:

- tenant-private brand and approval memory;
- consented privacy-safe aggregate benchmarks;
- evidence-backed recommendations and route evaluation; and
- holdouts, explanations, rollback, and guardrails.

Verification:

- at least 10% relative lift in a predeclared primary measure;
- no quality, policy, privacy, or reliability regression;
- reproducibility across at least three organizations; and
- baseline behavior returns when the learned signal is disabled.

### PR I — Workflow Embeddedness

Scope:

- organization/client policy packs and escalation;
- beachhead integrations and API contracts;
- lineage-preserving import; and
- complete portable campaign and audit export.

Verification:

- 90-day cohort retention and third-campaign reuse;
- recurring policy-pack plus integration usage; and
- export/re-import audit reconstruction.

### PR J — Vertical Distribution and Extensions

Scope:

- segment positioning, onboarding, proof, and pricing;
- customer-approved case studies;
- certified adapter/integration SDK; and
- partner and contributor acquisition attribution.

Verification:

- repeatable channel share over two measurement periods;
- three externally owned live certified integrations; and
- predeclared paid-pilot conversion threshold.

### PR K — Defensibility Review

Scope:

- 3/6/12-month counterfactual clone review;
- protected-asset inventory;
- replacement-cost and switching interviews;
- unit economics and concentration risk; and
- evidence-backed continue, narrow, partner, open-source, or stop decision.

Verification:

- Gate 11 criteria are evaluated without waivers;
- every moat claim cites retained usage, lift, workflow, or distribution
  evidence; and
- failed criteria produce an owned remediation or stop decision.

## Immediate X Smoke Checklist

The runbook remains authoritative. Planning status:

- [x] X API v2 create-post contract deployed.
- [x] Three-post X-only starter campaign seeded.
- [x] Health checks and post-merge deployment verified.
- [x] Operator runbook committed.
- [ ] Account owner confirms the exact OmniPost X handle.
- [ ] Account owner approves post 1 copy.
- [ ] OAuth 2.0 PKCE app and user-context token are authorized.
- [ ] X API credits are confirmed.
- [ ] Key Vault reference resolves without exposing the value.
- [ ] Staffed smoke window is agreed.
- [ ] Exactly one post is queued and processed.
- [ ] Public result and no-duplicate observation are captured.
- [ ] Seven-day campaign observation and decision are recorded.

## Dependencies and Stop Conditions

| Dependency or risk          | Required action                                  | Stop condition                                    |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| X account ownership         | Human account owner confirms handle and copy     | Ownership or approval is ambiguous                |
| X API access and credits    | Confirm current developer access before smoke    | Access, scope, or spend is unknown                |
| Credential handling         | Use Key Vault and redacted status only           | Secret value or secret URI appears in evidence    |
| Current memory-backed queue | Staff one isolated job and invoke once           | App restart, timeout, or unknown state            |
| Local campaign state        | Freeze exact approved copy before queueing       | Draft changes after approval cannot be reconciled |
| Provider response           | Capture ID and URL immediately                   | Provider result cannot be determined              |
| Duplicate protection        | Observe queue and public account after success   | More than one post or job appears                 |
| Attribution baseline        | Use stable campaign/content IDs from PR A onward | IDs differ across Notion, Git, runtime, or Baton  |

## Campaign Review Cadence

- **Preflight:** owner, account, copy, scopes, spend, deployment, health, and
  evidence destination.
- **Smoke + 10 minutes:** exact post, correct account, one provider ID, one
  public post, no delayed duplicate.
- **24 hours:** operational failures, replies, impressions, profile visits, and
  corrections.
- **Seven days:** campaign metrics, attribution quality, AI/editorial notes,
  incidents, and decision.
- **Decision:** continue posts 2/3, revise the campaign, pause, or stop.

## Definition of Done

The X-first campaign initiative is complete only when:

1. the first controlled post and evidence pass;
2. campaign and approval state survive restart;
3. OAuth and the scheduler no longer rely on manual static-token operation;
4. one campaign item is traceable through durable publish and conversion
   evidence;
5. AI adaptations have first-party review and quality records;
6. the campaign has a documented decision and retrospective; and
7. LinkedIn has either passed its entry review or been explicitly deferred with
   a reason;
8. design partners produce a consented, evidence-complete corpus;
9. outcome intelligence demonstrates reproducible guarded lift;
10. retained customers repeatedly use embedded policies and integrations;
11. one vertical acquisition or extension channel compounds; and
12. the defensibility review either substantiates a specific moat or records a
    remediation/stop decision.
