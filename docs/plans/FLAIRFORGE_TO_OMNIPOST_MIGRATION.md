# FlairForge capability migration to OmniPost

- Status: Proposed
- Updated: 2026-08-27
- Decision: `docs/adr/0001-creative-assets-and-rendering-boundary.md`
- Baton epic: `905a9c80`

## Outcome

Absorb the useful FlairForge authoring concepts into OmniPost without creating
a second product runtime or moving product ownership into Mill. Preserve
provenance, rebuild against OmniPost contracts, validate one governed creative
path, and retire FlairForge only after traffic and dependency evidence reach
zero.

## Preserved source

The dirty FlairForge `feat/monorepo` worktree is preserved at snapshot commit
`9a582727caddd036870df1098397a9d1c75c3b16`, parent
`ae00b769c60e227c4ff2a97c9af3252b90146918`, and tree
`8567cdd83f2ec512e4c6997478437933102b7caf`. The source worktree and real index
were not changed.

The snapshot is recovery evidence, not a merge candidate. No bulk history
merge or direct copy into OmniPost is planned.

Durable shared recovery is stored in the private GitHub repository
`JustAGhosT/flairforge-recovery` on branch
`recovery/flairforge-wip-20260827` and release `recovery-20260827`:

- release URI:
  `https://github.com/JustAGhosT/flairforge-recovery/releases/tag/recovery-20260827`
  (authorized repository access required);
- Git bundle SHA-256:
  `0254DF071425F881ADA4B1ED6BE6DA6634CBDC2F0952643A3805178784460043`;
- inventory SHA-256:
  `226E39728DD5110F286AAA9712ADA204E4D32D6C9D511E340A36C42538B8CD34`;
- retention owner: `JustAGhosT`, through the migration and rollback window.

An authenticated clean download matched both hashes, `git bundle verify`
passed, and a fresh repository materialized the expected snapshot commit and
tree. Recovery requires downloading both release assets, comparing their
SHA-256 values, verifying the bundle, fetching
`refs/codex/flairforge-wip-20260827` from it into a clean repository, and
checking out the snapshot commit. Baton task `830f3b45` records the durable
receipts and full verification procedure.

## Scope map

| FlairForge material                                       | Migration action                                                                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Format categories/dimensions                              | Re-express as versioned OmniPost platform-format constraints; validate unit, DPI, bleed, and safe-area semantics.           |
| Template/section vocabulary                               | Reuse as design input for typed template slots; reject `any`, executable HTML, and stringly typed arbitrary styles.         |
| Category -> template -> content -> preview -> export flow | Rebuild as an OmniPost campaign creative composer.                                                                          |
| Scaled preview behavior                                   | Port as UX behavior and regression fixtures, not as trusted rendering implementation.                                       |
| Template API intent and tests                             | Port scenarios after the new API/domain contracts exist; API failures remain visible instead of silently loading mock data. |
| Cheesy Pig EJS, logo, and prepopulation                   | Archive as provenance/sample material only; require rights confirmation before any demo reuse.                              |
| SSR/Puppeteer/EJS export path                             | Reject and replace with the bounded Mill render-job adapter.                                                                |
| Mock AI/image/template modules                            | Reject as capability; implement only through governed OmniPost/Sluice paths with review evidence.                           |
| Netlify and monorepo notes                                | Archive for archaeology; do not treat as current OmniPost operations.                                                       |
| Turbo, test-result, coverage, and empty command artifacts | Disposable; never import.                                                                                                   |

## Delivery sequence and gates

### 1. Contract and provenance

Deliver this ADR, schema examples/tests in the implementation task, and a
source manifest mapping every imported concept or permitted asset to its
FlairForge path and snapshot commit.

Exit when tenant ownership, versions, hashes, approvals, render jobs,
accessibility, retention, audit events, and the Mill boundary are reviewable;
no provider credential or raw prompt is part of the contract; and the recovery
bundle has verified durable shared storage and clean-environment retrieval
evidence.

### 2. OmniPost composer slice

Implement the smallest credible flow inside an existing campaign:

1. choose one supported social format;
2. choose one versioned template;
3. edit typed slots using a tenant brand kit;
4. request a non-publishable preview;
5. create a new immutable creative variant version; and
6. approve or reject that exact version server-side.

Use durable tenant-scoped persistence and existing campaign/content/variant
identifiers. Do not expand into a general-purpose design suite.

Exit when reload preserves state; cross-tenant access tests fail closed; edits
after approval create a new version; accessibility fields are enforced; and
the audit trail reconstructs authoring and review. The implementation must
extend `approvalSchema`, Prisma `CampaignApproval`, and
`assertApprovedForQueue` so variant/template/asset versions, the complete target
specification, accessibility metadata, and canonical input hash are persisted
and revalidated. Tests independently change every bound input and prove the old
approval fails closed.

### 3. Mill adapter

Implement a provider-neutral `CreativeRenderer` port in OmniPost and a Mill
adapter with timeouts, request fingerprints, idempotency, bounded asset grants,
stable error classification, and renderer-version evidence. Keep a deterministic
test renderer for contract tests, not as a production fallback.

Exit when the same approved input produces a verified artifact hash, mismatched
hashes/stale approvals fail closed, unknown outcomes are reconcilable, and no
credential or source payload leaks to telemetry. Contract tests must also prove
canonicalization conformance between OmniPost and Mill, atomic idempotency under
concurrency, fingerprint-conflict rejection, in-flight retry behavior, artifact
reuse, safe pre-dispatch retry, expiry, and unknown-outcome reconciliation.

### 4. CoilTrace pilot

Run one staffed pilot from campaign variant through approval, render/export,
visible result, and audit record. Capture template/version IDs, input and output
hashes, renderer version, render latency, artifact metadata, reviewer, and
result. Authentic human approval and visible-result acceptance cannot be
simulated.

Exit when one real approved creative is exported or published through the
governed path with complete evidence, zero duplicate artifacts/posts, and no
tenant/privacy/control defect.

### 5. Retirement

Freeze new standalone FlairForge feature work after the composer pilot begins.
Keep the recovery bundle until the retention decision is recorded. Redirect
documentation and operator entry points only after OmniPost acceptance.

Retire the standalone runtime only when, for an agreed observation window:

- zero production traffic and scheduled work remain;
- zero active users, integrations, DNS routes, and runtime dependants remain;
- all selected provenance is recorded and all required data/assets are migrated;
- rollback and support ownership are explicit; and
- the OmniPost pilot has passed authentic acceptance.

Repository archival, DNS changes, deployment removal, and data deletion are
separate authorized operations. This plan does not perform them.

## Verification matrix

| Concern            | Required evidence                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Source durability  | Shared bundle URI, matching SHA-256, clean retrieval, retention owner, and recovery test                     |
| Tenant isolation   | API/data-access tests for read, update, asset access, render request, and export across two tenants          |
| Immutability       | Tests proving approved versions/hashes cannot be mutated and stale approval cannot render/publish            |
| Approval binding   | Independent invalidation tests for creative versions, target fields, accessibility metadata, and input hash  |
| Renderer boundary  | Canonicalization vectors plus concurrency, conflict, timeout, reconciliation, artifact reuse, and retry      |
| Accessibility      | Required alt text/reading order and platform dimension validation                                            |
| Privacy/security   | Upload validation/scanning, short-lived grants, allow-listed telemetry, and secret/prompt exclusion tests    |
| Audit              | Query reconstructing source asset -> template -> variant -> approval -> render -> artifact -> publish/export |
| Product acceptance | Staffed CoilTrace journey with legitimate reviewer and visible artifact/result                               |
| Retirement         | Time-bounded traffic, dependency, scheduled-job, data, DNS, and support-owner inventory                      |

## Metrics and review cadence

Review quarterly during prototype-to-alpha transition:

- active brand kits and versioned templates;
- campaigns with approved creatives;
- repeat creative-composer use;
- preview/render success rate and latency;
- approval reuse, rewrite, and rejection rates;
- approval-to-artifact trace completeness; and
- standalone FlairForge traffic and dependant count.

Metrics must use bounded identifiers/classifications, never raw prompts,
credentials, signed asset URLs, or full creative payloads.

## Rollback

Before standalone retirement, disable the OmniPost creative feature flag and
leave existing publishing paths unchanged. Render jobs are additive and must
not rewrite approved campaign/content state. After retirement, rollback means
restoring the preserved FlairForge snapshot/runtime under explicit operator
authorization; the bundle alone is not deployment approval.
