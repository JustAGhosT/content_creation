# OmniPost Alpha — Handoff Document

## 2026-08-09 X Acceptance Complete And Gate 4 In Progress

### Current State

- Authentic X publish acceptance passed for `@OmniPostHQ`. Exactly one approved
  X-only scheduler job, `job_1786238765946_c6a090e20`, published on its first
  attempt as provider post `2086262766420037970`:
  <https://x.com/OmniPostHQ/status/2086262766420037970>.
- The processor returned `processed=1`, `successful=1`, and `failed=0`. Five
  subsequent two-minute runs processed no jobs through the ten-minute
  observation window, no duplicate appeared, and the historical HTTP 402 job
  was not retried.
- X remains connected. Disconnecting it through OmniPost, proving provider
  revocation, and proving local credential removal remain a separate
  operator-authorized action. Do not expose tokens, cookies, OAuth session
  material, or secret URIs while performing that closeout.
- Canonical Baton task `7e1feab6-a668-4c18-b54d-691eddcd243f` owns the remaining
  X revocation boundary. Gate 4 task `9a3e5add-14ea-404a-bd73-41f455c0c75c`
  owns the next agent-executable product slice.

### Gate 4 Implementation

- [PR #202](https://github.com/neuralliquid/omnipost/pull/202) on branch
  `agent/gate4-attribution-workbook` starts from deployed `origin/main` commit
  `df4b14e97ec2088ec88a55ac88ebeb474a6c8604`.
- A PostgreSQL `AnalyticsEventRecord` stores idempotent, tenant-scoped,
  allow-listed product and campaign events. Unknown properties and
  secret-bearing attributes are rejected; trusted campaign lifecycle events
  cannot be authored through the browser endpoint.
- Campaign creation, content approval, durable queueing, provider attempts, and
  publish outcomes emit evidence from the same database transactions that own
  those state changes.
- `GET /api/analytics/workbook?campaignId=...` returns the nine Gate 4 workbook
  views and an explicit runtime-versus-telemetry reconciliation result. It does
  not ingest provider analytics or infer engagement that OmniPost has not
  received.
- Review hardening makes attribution tokens globally unique and server-owned,
  validates properties against their specific event contract, preserves the
  existing bounded `post_created.status` field, and reports
  `reconciliation_required` provider outcomes as unknown rather than failures.
- Public attribution captures `mtk`/`campaign_token` from landing URLs, persists
  it with bounded UTMs, emits landing and signup-CTA evidence, and resolves the
  immutable linked campaign version. Public ingestion strips caller-authored
  identity headers and accepts ownership only from proxy-verified JWT context or
  a recognized opaque campaign token.

### Next Session: Private Preview UX And Navigation

These items are deliberately queued for the next session and are **not**
implemented by PR #202:

1. Baton task `69643968-5c33-4193-9e75-8eeede6c5c06` — establish a single
   truthful `Private Preview` product-status source and show it on sign-in, as
   an accessible authenticated-header pill, and in the footer. Preserve auth
   behavior and responsive layouts, and close with focused tests plus rendered
   desktop/mobile evidence.
2. Baton task `578c6e2c-8ff0-4836-941c-8aa0c603d807` — audit the public and
   authenticated journeys, then improve task-oriented header groupings, primary
   actions, active states, keyboard/mobile navigation, and shell ownership.
   Scope the information architecture before implementation and close with
   focused tests plus rendered desktop/mobile evidence.

Start from current `origin/main`, inspect the existing sign-in, shared header,
dashboard shell, and footer implementations before editing, and keep product
status copy centralized so the three surfaces cannot drift.

### Next Session: Cross-Repo Neural Liquid Migration Program

Baton parent task `2fcf19ee-b5c7-462f-ad66-a9ecc692d17c` is the canonical
restart point for a comprehensive plan covering OmniPost, ConvoLens, Cognitive
Mesh, and NexaMesh. The two Private Preview tasks above are children of this
program. Planning and inventory come before any Azure, DNS, identity, data, or
deployment mutation.

#### Verified Starting Point

- Mystira's useful reference patterns are conventional-commit SemVer, a
  protected release PR, immutable tags, stamped `version + commit + builtAt`
  runtime evidence, post-deploy version verification, per-deploy Discord
  notices, and independent marker-tag windows for daily and Friday weekly
  summaries. The marker design reports what actually shipped, rolls missed
  windows forward, and does not call merged-but-undeployed work released.
- Azure subscription `bb4e3882-2079-4bab-8974-611bc0b8bb58` currently contains
  both `mys-*` and `nl-*` estates. Resource names therefore do not prove a
  separate Neural Liquid subscription boundary. The next session must identify
  the authoritative target subscription GUID, tenant, billing owner, and
  management boundary before moving anything.
- OmniPost's discovered estate is `nl-dev-omnipost-rg` in that shared
  subscription: Web App, PostgreSQL, Key Vault, App Insights/Log Analytics,
  Container Apps environment/Sluice, scheduler job, DNS certificate, and
  identities. Its package version is still `1.0.0`; the active deployment
  workflow has no durable automated release/version/Discord summary contract.
- ConvoLens has dev and production resources in the same subscription, including
  Web App, Container Apps, storage, Cosmos, Key Vault, ACR, telemetry, and
  Terraform state. GitHub currently targets subscription `bb4e...`, tenant
  `9530...`, and version `0.1.0`; its repository variables also retain a
  Mystira-admin setting that must be classified rather than blindly copied.
- Cognitive Mesh's production API/frontend App Services, slots, Key Vault,
  certificates, and Terraform state are in the same subscription. Its version
  is `0.0.1`; deployment uses staging slots and health checks, while current
  repository variables still reference Mystira Identity and PhoenixVC-hosted
  Docket/Sluice endpoints and secret URIs.
- NexaMesh's canonical source found in this checkout is
  `Nexamesh/nexamesh-core`. Its existing release workflow creates changelogs
  and GitHub Releases only after a tag; it does not create the revision bump.
  `www.nexamesh.ai` points to `nex-prod-marketing-swa` in
  `nex-prod-shared-rg`, but the DNS zone itself is in
  `mys-global-shared-rg`. That shared Mystira ownership is an explicit
  migration or governance decision, not a completed Neural Liquid cutover.

#### Canonical Task List

1. `389a7fbb-ff93-4a6e-87da-b3ae4e502b62` — decide the authoritative
   Neural Liquid subscription/tenant and produce a four-repo current-to-target
   inventory covering OIDC, environments, state, runtime, data, DNS,
   certificates, secrets, identity, telemetry, backups, cost, dependencies,
   move-versus-rebuild feasibility, sequencing, rollback, and retirement.
2. `d7cb51ce-2448-49a6-a50f-a0a3859b53f0` — design the reusable CI/CD
   baseline: exact-head component gates, path-aware reusable workflows,
   concurrency, least-privilege OIDC, protected environments, pinned actions
   and toolchains, dependency/secret/code scans, IaC plan, database migration
   gates, provenance/SBOM, staging or canary promotion, post-deploy E2E,
   observability evidence, runtime-version proof, rollback, and branch rules.
3. `6ed39c8a-86f8-4599-a7be-e506dd637e3b` — standardize revision bumps,
   release PRs/tags/changelogs, artifact and runtime stamping, the same approved
   Discord release destination, and Friday shipped summaries with dry-run,
   idempotency, duplicate suppression, independent marker windows, and
   missed-run roll-forward.
4. `c7bb4242-ed50-45d7-9c49-277d691a8a0e` — OmniPost workstream:
   subscription migration, version evidence, Mystira Identity, user/session
   migration, Private Preview surfaces, journey/header optimization,
   accessibility/responsive proof, scheduler/data/attribution acceptance, and
   rollback. The detailed UX children are `69643968-...` and
   `578c6e2c-...`.
5. `da68d7eb-28b0-4741-969b-1e4fe579c9fd` — ConvoLens workstream:
   migrate web/API/data/state/identity/telemetry/DNS, remove inappropriate
   cross-product admin coupling, add release evidence, optimize capture,
   catch-up, and personal-todo flows, preserve privacy and confirmation, and
   prove authentic extension/web/API behavior plus rollback.
6. `96c933d2-c11d-4c2b-9653-962ff28e60c9` — Cognitive Mesh workstream:
   migrate API/frontend/slots/state/DNS/secrets/telemetry, replace residual
   PhoenixVC service dependencies only after target services are verified, add
   release evidence, optimize the control UI, integrate Mystira Identity and
   roles, and prove health, model routing, authorization, and rollback.
7. `0bcb613d-888a-41dd-9a55-7b1d2591c492` — NexaMesh workstream:
   confirm source and ownership, migrate marketing/docs/functions/ML and DNS,
   reconcile the tag-driven release with automated revisions and runtime
   provenance, add Discord/weekly summaries, optimize UI, integrate Mystira
   Identity, and prove custom domains, APIs, authorization, and rollback.
8. `c7f52d07-fc2a-4cfe-abed-9a1071168652` — execute approved staged
   cutovers: backups/restores, target deployments, data and secret migration,
   DNS TTL/certificate checks, health/version/synthetic/authentic identity and
   role/UI/accessibility/telemetry acceptance, observation, cost reconciliation,
   rollback drills, and only then legacy resource, state, OIDC, and DNS
   retirement under explicit destructive authorization.

The next session should turn this inventory into an ordered decision record and
per-repository PR plan with dependencies, estimates, owners, acceptance gates,
and rollback points. Do not combine all four implementations into one PR, do
not copy production secrets between tenants, and do not retire the shared
estate until target data, DNS, identity, and runtime evidence all pass.

### Validation And Continuation

- Prisma client generation and schema validation, TypeScript, marketing contract
  validation, lint, targeted Prettier, and the production build pass locally.
  The build compiled 60 routes/pages, including `/api/analytics/workbook`. Lint
  retains the repository's 120 pre-existing warnings and adds no errors.
- Jest passed 51 suites and 356 tests. Two PostgreSQL integration suites and 11
  tests were skipped because no local test database was supplied; CI must run
  them against PostgreSQL before merge.
- `pnpm check-all` passed marketing validation, TypeScript, and lint, then
  stopped at the repository's existing Windows Prettier baseline (504 unrelated
  files). Targeted Prettier for every changed JavaScript, TypeScript, and Markdown
  file passed, as did `git diff --check`.
- Before merge, run `pnpm check-all`, obtain exact-head CI and review-thread
  proof, and keep deployment separate from local validation.
- Before deployment, inventory duplicate `AttributionLink.trackingToken` values.
  The migration deliberately fails closed if any exist because silently
  rewriting a token would misattribute already-distributed URLs; regenerate the
  affected campaign links and update their destinations before retrying. Then
  apply the committed PostgreSQL migration before the new code serves analytics
  traffic and use an authenticated read-only workbook request to verify schema
  availability. No provider publish,
  disconnect, Pinterest smoke, or production telemetry fabrication is part of
  that verification.

---

## 2026-08-09 X Billing Hardening And Operations Reconciliation

### Current State

- [PR #199](https://github.com/neuralliquid/omnipost/pull/199) is the active
  change for classifying X API HTTP 402 responses as operator-actionable and
  non-retryable, persisting the classification, and showing truthful provider
  capacity guidance in the platform settings UI.
- The implementation was rebased onto `origin/main` at
  `233f6c0a266af5d11bd9c61fb5480dffb2df6cff` and marked ready for review. It
  must not be merged without fresh exact-head CI, review-thread, mergeability,
  and user-authorization checks.
- The X Developer Console showed a `US$5.00` prepaid balance on 2026-08-09
  (`US$0.00` free credits). Authentic acceptance still requires the PR gates,
  merge authority, and explicit authorization for one staffed job. Do not retry
  the existing dead job or create another job during code validation.
- The Pinterest console showed the OmniPost app as `Sandbox` / `Production
limited` on 2026-08-09, superseding the July 28 `Trial access pending`
  snapshot. Token controls are operator-held; no token was copied or used.

### Validation

- Marketing contract validation, TypeScript, and lint passed locally; lint
  retained the repository's 120 pre-existing warnings and added no errors.
- The production Next.js build passed with all 59 static pages generated.
- Jest passed 48 suites and 338 tests; 2 PostgreSQL integration suites and 11
  tests were skipped locally because no test database was supplied. The four
  PR-specific suites passed 17/17 tests.
- Review follow-up preserves publisher error classifications in the scheduler,
  selects X capacity evidence by the latest attempted publish, and provides the
  missing Pinterest operational profile. It also unwraps partial-thread provider
  failures and retains confirmed billing evidence while a manual retry is queued
  or claimed. The latest four scheduler/capacity regression suites pass 21/21
  tests; the focused Pinterest profile suite and ESLint, Prettier, and TypeScript
  checks pass.
- `git diff --check` passed. The repository-wide Windows Prettier check remains
  blocked by the existing broad formatting baseline, so GitHub's Linux format
  check is authoritative for the refreshed PR head.

### Workspace And Tracker Follow-up

- Three missing `C:\tmp` worktree registrations were pruned. The primary
  checkout's untracked Pinterest source icon at
  `output/imagegen/omnipost-app-icon.png` must be preserved during branch
  cleanup.
- The primary checkout is on current `main`; merged branch clutter is removed,
  and `agent/x-402-nonretryable` is retained until PR #199 is closed.
- The stale Gate 3B, Gate 3C, and parent records are closed. The canonical X
  and Pinterest acceptance tasks now hold the live console evidence and retain
  their explicit operator-action boundaries.
- Baton task `e050947d-655f-481a-97a9-0bdbd203d1aa` tracks OmniPost-to-Sluice
  verification separately: prove a real routed request,
  model alias, cost/operation telemetry, and fail-closed behavior before
  deciding whether to migrate from the OmniPost-owned LiteLLM Container App to
  the shared `phoenixvc/sluice` gateway. No provider call, spend, deployment, or
  migration is authorized by this handoff.

### Exact Continuation

1. Wait for all checks and bot reviews on the latest PR #199 head, then inspect
   GraphQL `reviewThreads`, exact head SHA, mergeability, and checks again.
2. If the PR is green and review-clean, request explicit merge authorization;
   do not infer it from this handoff.
3. Perform a no-spend OmniPost-to-Sluice configuration and contract preflight.
   A billable or production gateway request requires separate authorization.
4. After merge and explicit operator authorization, execute at most one staffed
   X job and capture authentic acceptance evidence. The console-status check did
   not authorize publishing, retrying a job, or creating a Pin.

---

## 2026-07-28 Pinterest Sandbox Registration Handoff

### Current State

- **Production commit:** `e073264913492b3728d95c96945abcdeaf2af9f3` on
  `main`, merged through
  [PR #200](https://github.com/neuralliquid/omnipost/pull/200).
- **Production verification:** post-merge CI run
  [30338120219](https://github.com/neuralliquid/omnipost/actions/runs/30338120219)
  and Azure deployment run
  [30338120251](https://github.com/neuralliquid/omnipost/actions/runs/30338120251)
  passed. The public `/api/health` and `/privacy` endpoints returned HTTP 200.
- **Pinterest developer app:** `OmniPost Sandbox`, App ID `1595103`.
- **Provider state:** **Trial access pending**. Pinterest reports that the
  connection request is still being reviewed. This is registration evidence,
  not API-access or publishing proof.
- **Baton task:** `57cc115e-4234-435c-ab34-8329f1596086`, retained
  `inprogress` while waiting on the provider and the reversible sandbox smoke.
- **X acceptance remains separate:** Gate 3 task
  `8b2fe3e9-1765-464d-9e88-6f8aed147769` and controlled-live-post task
  `7e1feab6-a668-4c18-b54d-691eddcd243f` still require the explicitly approved,
  staffed X post, no-duplicate evidence, and disconnect/revocation proof.

### Delivered

- Added a Pinterest API v5 client pinned to the provider-operated Sandbox host,
  a media-required scheduler adapter, sanitized provider errors, configuration
  checks, and create/read/delete smoke tooling.
- Added the public OmniPost privacy page required for provider registration.
- Added unit and scheduler-adapter coverage and the operator runbook at
  [`docs/runbooks/PINTEREST_SANDBOX.md`](runbooks/PINTEREST_SANDBOX.md).
- Created the Pinterest business/developer account, verified its email, restored
  the expired registration form, uploaded the OmniPost app icon, and submitted
  the connection request.
- Preserved the operator-selected registration choices exactly: Consumer
  experience; Pin creation and scheduling, Reporting, Ad campaign management,
  Ecommerce, and Recommendations & experimentation; Creators, Advertisers,
  Merchants, and Businesses; reads Pins and boards for general users.

### Verification And Evidence Boundary

- PR #200 was merged with the user's explicit admin-bypass approval after its
  implementation checks passed; its post-merge CI and deployment then passed.
- Pinterest assigned App ID `1595103` and shows `Trial access pending` with the
  request under review. No access token or credential was recorded in source,
  GitHub, Baton, or this handoff.
- The sandbox smoke has **not** run. Do not label the integration verified,
  connected, or publishable until Pinterest grants Trial access and the
  provider create/read/delete sequence succeeds.
- The generated icon remains a local, untracked source artifact at
  `output/imagegen/omnipost-app-icon.png` in the primary checkout; Pinterest has
  the uploaded copy. Do not treat that local path as a deployed application
  asset.

### Exact Continuation

1. Wait for Pinterest's review email; do not create a duplicate connection
   request or change the submitted choices while this request is open.
2. After Trial approval, open **My apps > OmniPost Sandbox**, generate the
   provider's 30-day sandbox token, and create a non-group sandbox board. Never
   paste the token into chat, source, GitHub, Baton, logs, or shell history.
3. Select a public HTTPS image URL that contains no secrets or personal data.
   Supply `PINTEREST_SANDBOX_ACCESS_TOKEN`, `PINTEREST_SANDBOX_BOARD_ID`, and
   `PINTEREST_SANDBOX_IMAGE_URL` only through an ephemeral environment, then
   run `pnpm smoke:pinterest-sandbox` according to the runbook.
4. Require one successful Sandbox Pin create, exact-ID read-back, and delete.
   Record only nonsecret IDs and results as `provider_sandbox`, never
   `live_publish`.
5. Keep Pinterest unavailable for ordinary OmniPost scheduling until a complete
   encrypted, tenant-scoped OAuth lifecycle and server-owned readiness contract
   are implemented. Keep the authentic X gate independent.

Stop on denied Trial access, unexpected account or app identity, a group board,
401/403, an unknown provider outcome, failed cleanup, or any request to expose
credentials. Do not retry an unknown create outcome blindly.

---

## 2026-07-27 Content Delivery Status And X Acceptance Handoff

### Current State

- **Production commit:** `55671d5abd39159eacb52fa5a21374b1e7d41297` on `main`.
- **Delivery-status UX:** content cards open a dedicated detail view rather
  than the composer. Newly created posts retain stable content and scheduler
  job IDs, so their list and detail states are refreshed from the authenticated
  scheduler response.
- **Legacy content boundary:** older browser-session cards without retained
  scheduler job IDs show **Tracking unavailable**. Do not infer provider state
  from matching copy, time, or platform.
- **X acceptance:** Gate 3 task `8b2fe3e9-1765-464d-9e88-6f8aed147769` and
  controlled-live-post task `7e1feab6-a668-4c18-b54d-691eddcd243f` remain
  `inprogress` only for the explicitly approved, staffed X post and the
  subsequent disconnect/revocation proof.

### Delivered

- [PR #196](https://github.com/neuralliquid/omnipost/pull/196), merge
  `b4d42d168cf1c8a0de36892211196ca952510219`: added content detail navigation,
  explicit post/review information, stable scheduler-job linkage, and truthful
  status labels.
- [PR #197](https://github.com/neuralliquid/omnipost/pull/197), merge
  `55671d5abd39159eacb52fa5a21374b1e7d41297`: addressed the two late automated
  findings from #196 by paginating scheduler status reads through the API's
  returned total and retaining scheduled time after completion or failure.

### Verification

- Both PRs were clean, CI-green, and had no actionable review threads before
  merge. A late automated review on #196 produced two valid findings; both were
  covered by focused tests and merged in #197.
- PR #196 main CI run
  [30257732303](https://github.com/neuralliquid/omnipost/actions/runs/30257732303)
  and Azure deployment run
  [30257732310](https://github.com/neuralliquid/omnipost/actions/runs/30257732310)
  succeeded.
- PR #197 main CI run
  [30264735513](https://github.com/neuralliquid/omnipost/actions/runs/30264735513)
  and Azure deployment run
  [30264735490](https://github.com/neuralliquid/omnipost/actions/runs/30264735490)
  succeeded, including deployment health verification.
- Local validation for the status work included TypeScript, ESLint, Prettier,
  a six-case scheduler-status test suite, and a production build.

### Exact Continuation

1. For a new post, use the retained scheduler job IDs as the only client-side
   join to live scheduler state; do not revive legacy cards by heuristic.
2. For remaining X acceptance, obtain explicit approval naming the account
   owner and technical operator, the exact text-only copy, and a staffed window.
   Follow `docs/runbooks/X_CAMPAIGN_GO_LIVE.md` and require scheduler success,
   provider ID, public URL, and ten-minute no-duplicate evidence.
3. Disconnect through OmniPost after successful acceptance and capture only
   nonsecret provider revocation and local credential-removal evidence in Baton.
4. Never record OAuth state, authorization codes, client credentials, tokens,
   browser session material, or secret URIs in GitHub, Baton, source, logs, or
   this handoff.

---

## 2026-07-27 Product Trust And X Readiness Handoff

### Current State

- **Production commit:** `b35744dc3abe62dde44be03d0cc8be5b14d89aea` on `main`.
- **Open pull requests:** none from this closeout.
- **Production health:** `GET /api/health` returned HTTP 200 with
  `status=healthy`, `environment=production`, and version `0.1.0` after the
  final deployment.
- **X connection:** the production Settings page confirmed the dedicated
  OmniPost X account is connected. No post was published and no credential or
  token was recorded in this handoff.
- **Baton tasks:** Gate 3 task `8b2fe3e9-1765-464d-9e88-6f8aed147769` and the
  controlled-live-post task `7e1feab6-a668-4c18-b54d-691eddcd243f` remain
  `inprogress` only for the explicitly approved, staffed publish and
  disconnect/revocation acceptance.

### Delivered

- [PR #192](https://github.com/neuralliquid/omnipost/pull/192), merge
  `7b360d571ded4b985634c846871ce0020371b237`: removed fabricated dashboard
  engagement data and browser-side Airtable connection state. The dashboard
  now presents an explicit verified-empty state until real data exists.
- [PR #193](https://github.com/neuralliquid/omnipost/pull/193), merge
  `3ad6458914bf577b096b866e8b537b77ae7cd4c8`: made platform readiness
  server-authoritative. Only configured, connected X is publishable;
  Facebook, Instagram, LinkedIn, TikTok, and Custom Channel are Coming Soon.
  Campaign idempotent replays are returned before current readiness is checked.
- [PR #194](https://github.com/neuralliquid/omnipost/pull/194), merge
  `b35744dc3abe62dde44be03d0cc8be5b14d89aea`: made the authenticated
  dashboard shell the sole owner of its header and main landmark, removed
  nested marketing chrome, and gave the dashboard skip link a unique target.

### Verification

- All three PRs were CI-green, mergeable, and free of current actionable
  review feedback immediately before merge.
- Two P2 automated findings discovered during ready-for-review were fixed:
  idempotent campaign replay ordering (#193) and the duplicate dashboard skip
  target (#194). Their threads are now outdated; no thread was manually
  resolved or replied to.
- [Final main CI run 30239729628](https://github.com/neuralliquid/omnipost/actions/runs/30239729628)
  passed.
- [Final Azure Web App CI/CD run 30239729631](https://github.com/neuralliquid/omnipost/actions/runs/30239729631)
  passed for `b35744d`.
- Targeted validation included TypeScript, ESLint, Prettier, dashboard-shell
  regression coverage, and scheduler-route coverage. CI ran the complete
  repository gate on Linux.

### Exact Continuation

1. Do not represent any non-X platform as connected or publishable until its
   server-owned connection lifecycle exists and equivalent readiness checks are
   implemented.
2. For the remaining X acceptance, obtain explicit approval for exactly one
   text-only post and follow `docs/runbooks/X_CAMPAIGN_GO_LIVE.md`. Require the
   provider post ID, public URL, scheduler success, and ten-minute
   no-duplicate evidence.
3. Then disconnect in OmniPost and capture provider revocation and local
   credential-removal evidence. Record only nonsecret evidence in the two
   Baton tasks above.
4. Never expose OAuth state, authorization codes, client credentials, tokens,
   or browser session material in chat, GitHub, Baton, source, or logs.

---

## 2026-07-27 Gate 3 Production Handoff

### Current State

- **Production commit:** `a279a4bc4f804c9a78ef75914a96c16459800b70`
  on `main`.
- **Open pull requests:** none at handoff.
- **Production health:** HTTP 200 with `status=healthy`.
- **Recurring processor:** Azure Container Apps Job
  `nl-dev-omnipost-scheduler`, scheduled every two minutes.
- **Baton Gate 3 task:** `8b2fe3e9-1765-464d-9e88-6f8aed147769`,
  intentionally `inprogress` and waiting on authentic X evidence.
- Use the isolated clean worktree at `C:\tmp\omnipost-gate3-c2` for
  continuation. The primary checkout remains on
  `agent/gate3-x-oauth-lifecycle` and should not be repurposed without first
  reconciling its owner and state.

### Delivered

- [PR #181](https://github.com/neuralliquid/omnipost/pull/181), merge
  `34bc8514c47bf2a7268f55bbaacb916a9cc74b8e`: encrypted tenant-owned X
  OAuth account lifecycle, PKCE connect, refresh, reconnect, and provider
  revocation.
- [PR #182](https://github.com/neuralliquid/omnipost/pull/182), merge
  `f77f89b41a7fdbfc29e57751b0b93138da886d5b`: durable leased and
  idempotent scheduler queue, classified retries, dead-letter state,
  rate-limit coordination, and reconciliation boundaries.
- PRs
  [#185](https://github.com/neuralliquid/omnipost/pull/185) through
  [#190](https://github.com/neuralliquid/omnipost/pull/190): recurring Azure
  processing, per-owner X grant resolution, dedicated cron authentication,
  managed-identity Key Vault lookup, and the exact proxy exemption required
  for the machine endpoint to reach its cron-secret boundary.
- The scheduler no longer depends on a legacy static X access token for
  publishing. Per-account user-context grants remain encrypted in PostgreSQL
  and are resolved server-side.

### Production Evidence

- PR #190 CI passed all eight checks.
- [Post-merge main CI run 30220709462](https://github.com/neuralliquid/omnipost/actions/runs/30220709462)
  completed successfully for `a279a4b`.
- [Azure deployment run 30220709460](https://github.com/neuralliquid/omnipost/actions/runs/30220709460)
  passed build, Terraform plan, database migrations, Web App deployment, and
  health verification for the same commit.
- [Terraform apply run 30217028946](https://github.com/neuralliquid/omnipost/actions/runs/30217028946)
  completed successfully for the scheduler infrastructure and runtime
  settings.
- Five consecutive live executions at 21:52, 21:54, 21:56, 21:58, and 22:00
  UTC on 2026-07-26 reported `Succeeded`.
- App Service HTTP telemetry recorded HTTP 200 from
  `omnipost-azure-scheduler/1.0` on consecutive scheduled calls.
- The controlled production processor smoke returned HTTP 200 with
  `processed=0`, `successful=0`, and `failed=0`.
- Temporary diagnostics were removed. Filesystem application logging was
  restored to `Off`; the original HTTP-log retention remains enabled.
- No provider credential, OAuth token, scheduler secret, or secret hash was
  printed or persisted in evidence.

### Remaining Gate And Exact Continuation

Gate 3C recurring processing is complete. Do not reopen scheduler
infrastructure work unless live evidence regresses. Overall Gate 3 remains open
only for an authentic, staffed X acceptance:

1. Name the account owner and technical operator, confirm the dedicated
   OmniPost X handle, and approve exactly one text-only smoke post.
2. Confirm the approved X developer app uses the exact callback
   `https://omnipost.neuralliquid.ai/api/platforms/x/callback`, the scopes
   `tweet.read tweet.write users.read offline.access`, and sufficient API
   credits.
3. Confirm the X client ID and secret Key Vault references are `Resolved`
   without reading or printing their values.
4. Follow [the X campaign go-live runbook](runbooks/X_CAMPAIGN_GO_LIVE.md).
   Connect through **Settings > Platform Connections** and verify the intended
   handle.
5. During a staffed window, queue exactly one approved X-only job and let one
   scheduled execution process it. Require `processed=1`,
   `successful=1`, `failed=0`, one provider post ID, one public X URL, and
   no duplicate after ten minutes.
6. Disconnect through OmniPost and prove provider revocation plus local
   credential removal. Record only nonsecret evidence in Baton tasks
   `8b2fe3e9-1765-464d-9e88-6f8aed147769` and
   `7e1feab6-a668-4c18-b54d-691eddcd243f`.

Stop on a 401/403, wrong account, duplicate, altered copy, unresolved Key Vault
reference, unknown provider outcome, or missing audit evidence. Never fabricate
credentials, copy user tokens into Key Vault or shell history, or retry an
unknown publish outcome blindly.

---

## 2026-07-25 X OAuth Account Lifecycle — Gate 3 C1

### Current State

- **Draft implementation PR:** [#181 — X OAuth account lifecycle](https://github.com/neuralliquid/omnipost/pull/181)
- **Implementation branch:** `agent/gate3-x-oauth-lifecycle`
- **Implementation commit before this handoff:** `4bd537c13174d667ffb67c59048fbc3ab04b3136`
- **Baton Gate 3 task:** `8b2fe3e9-1765-464d-9e88-6f8aed147769`
- The PR remains draft until an approved X OAuth application can provide real
  callback and account proof.

### Delivered

- Added tenant-owned `PlatformAccount` persistence with forward-only
  PostgreSQL migration, provider/account uniqueness, lifecycle status, scopes,
  expiry, and revocation timestamps.
- Added X OAuth 2.0 Authorization Code with PKCE, short-lived sealed state and
  verifier cookies, exact callback routing, production HTTPS enforcement,
  refresh-token rotation, provider-side revocation, and reconnect handling.
- Added versioned AES-256-GCM token encryption with purpose-bound associated
  data. Raw provider tokens are neither returned by the API nor stored in
  plaintext.
- Added authenticated connect, connection-status, refresh-aware token access,
  and disconnect routes plus the dashboard connection controls.
- Added a generated Key Vault encryption key and App Service custom connection
  reference. X client credentials deliberately remain externally supplied
  secrets rather than Terraform-generated values.

### Verification

- `pnpm run type-check` passed.
- `pnpm run lint` passed with zero errors and 120 pre-existing warnings.
- Windows-safe repository Prettier validation passed. The standard
  `pnpm check-all` format stage remains incompatible with the worktree's
  existing CRLF files and reports unchanged files.
- All 35 Jest suites and 255 executed tests passed; one PostgreSQL integration
  suite was skipped because Docker Desktop was unavailable.
- `pnpm run build` passed.
- `pnpm run marketing:validate` passed.
- Prisma 7.1 client generation passed.
- Terraform formatting and `terraform validate` passed after provider
  initialization.
- At handoff, all nine checks on PR #181 passed, including the protected
  Terraform plan. There were no submitted reviews or inline review threads.

### Deployment Boundary And Continuation

- This slice does not configure an X developer application, purchase provider
  credits, connect a real account, or prove a production post/revocation flow.
  Those steps require approved external credentials and account authorization.
- A health check is not authenticated X proof. Keep the PR draft, obtain real
  consent through the visible X flow, and record connect, refresh/reconnect,
  post, and revoke proof without exposing tokens.
- The scheduler still uses the legacy static X token path. Gate 3 C2 must wire
  publishing to the persisted account token accessor before the static token
  can be removed.
- Do not merge on green CI alone: inspect current human/bot reviews and all
  unresolved threads again immediately before any ready-for-review or merge
  transition.

---

## 2026-07-25 Durable Application Database — Gate 3 Slice

### Current State

- **Gate 2 implementation:** PR #177 merged at
  `e32a5b769a1cff642cd7bb87b9f642266df0cb79`.
- **Gate 3 implementation:** PR #178 merged at
  `1316d260bebaacbd56ee0a13269ef5471d1ec392`.
- **Deployment workflow fix:** PR #179 merged at
  `a8876a19b1048bee8ec8f1635cd643474cc3985d`.
- **Key Vault reference fix:** PR #180; the corrected reference is applied and
  production persistence proof passes.
- **Azure plan:** `.azure/plan.md` is `Deployed`.
- **Database region:** North Europe, the lowest-cost supported European B1ms
  region verified for this subscription, estimated at approximately USD 17.19
  per 730-hour month with 32 GiB before backup overage and transfer.
- **Isolation:** the new `omnipost_app` database is on an OmniPost-only
  PostgreSQL 16 server. The existing Sluice/LiteLLM server and `omnipost`
  database are not reused.

### Prepared And Validated

- Replaced the Prisma SQLite adapter with Prisma 7's PostgreSQL adapter.
- Preserved SQLite migration history in
  `prisma/migrations-sqlite-archive/` and created one complete PostgreSQL
  baseline migration.
- Replaced production `db push` and packaged SQLite with
  `prisma migrate deploy`.
- Added PostgreSQL 16 CI services and a real restart-persistence integration
  test.
- Added Terraform for the dedicated B1ms server, database, generated
  credential, versionless Key Vault secret reference, managed identity, RBAC,
  and App Service diagnostics.
- Updated deployment to retrieve and mask the Key Vault connection URL before
  applying migrations, then deploy the standalone zip.

### Verification

- Terraform provisioned 12 resources, changed 2 in place, and destroyed 0.
- The live database is PostgreSQL 16 on Burstable B1ms with 32 GiB, seven-day
  backup, no HA, and no geo-redundant backup.
- GitHub Actions run `30164870954` passed build, Terraform planning, the
  PostgreSQL migration, Web App deployment, and automated health verification.
- App Service reports the Key Vault connection-string reference as `Resolved`
  through `nl-dev-omnipost-msi-web-kv`.
- An authenticated production smoke registered a non-PII evidence user,
  imported the canonical campaign, read its audit state, restarted App Service,
  and read it again. Version 1 and the snapshot hash were unchanged; the audit
  retained one version and all three attribution links.
- PostgreSQL baseline migration applied successfully to a clean PostgreSQL 16
  container.
- Restart-persistence integration passed with immutable approval and
  tenant-bound attribution state.
- `pnpm run type-check` passed.
- `pnpm run lint` passed with zero errors and 120 pre-existing warnings.
- Repository-wide Windows-safe Prettier validation passed.
- All 34 Jest suites and 241 tests passed.
- Next.js production build passed.
- Terraform format, validation, remote-state access, and policy checks passed.
- Live Terraform preview: 12 additions, 3 in-place updates, 0 destroys, and no
  replacements. The preview used placeholder Sluice inputs; deployment must
  use the real protected values and reject any residual Sluice change.
- The exact live package, `20260725115316.zip`, was downloaded through Kudu for
  pre-cutover inventory. Its SQLite database contains 19 application tables
  and zero rows in every table, so no user or campaign row migration is needed.

### Deployment Boundary And Continuation

- Gate 3's durable application database slice is live and verified. Key Vault
  purge protection is enabled, and the estimated USD 17.19/month database cost
  is active.
- The controlled dev database currently permits public access from Azure
  services because the B1 App Service has no VNet integration. Private
  networking and application-specific database roles remain hardening work.
- Continue Gate 3 in separate PRs for X OAuth lifecycle, durable queue leases
  and idempotency, recurring processing, retries/dead-lettering, rate limits,
  and provider reconciliation.
- Treat roadmap Gates 0–6 as prerequisites, not a moat claim. Gates 7–11 and
  the separate Gate 8A analyze–recommend–plan loop remain the defensibility
  evidence program; do not claim a moat before Gate 11 passes.

---

## 2026-07-25 Campaign Operating System — Gate 1 Handoff

### Current State

- **Implementation PR:** [#174 — campaign contract foundation](https://github.com/neuralliquid/omnipost/pull/174)
- **Roadmap PR:** [#173 — X-first campaign operating roadmap](https://github.com/neuralliquid/omnipost/pull/173)
- **Implementation branch:** `agent/campaign-contract-foundation`
- **Implementation commit before this handoff:** `1e195bfa052eaea3fbbd42a71d13d61890c854b7`
- **GitHub state at handoff:** PR #174 was cleanly mergeable and all eight CI checks passed.
- **Baton Gate 1 task:** `09b8fb82-d51a-4dc3-aa07-d05da4fd2431`
- **Notion roadmap:** <https://www.notion.so/3a77ad2bc5d68182867ced5e54d95957>

### Delivered

- Canonical JSON Schemas for campaigns, content, and AI-generation evidence.
- Versioned X channel constraints, OAuth scope requirements, approval rules, delivery evidence, and stop conditions.
- The canonical `omnipost-x-live-001` campaign, aligned with the existing three-post runtime seed.
- Attribution naming, privacy-safe telemetry, claim/proof, human approval, and provider-confirmed delivery contracts.
- `pnpm marketing:validate` plus a dedicated `marketing-contracts` CI job.
- Jest coverage that prevents the canonical campaign and runtime seed from drifting.

### Verification

- `pnpm run marketing:validate` — passed.
- `pnpm exec tsc --noEmit --incremental false` — passed.
- `pnpm run lint` — passed with zero errors and 120 pre-existing warnings.
- `pnpm test -- --runInBand` — 30 suites and 225 tests passed.
- Targeted Prettier validation and `git diff --check` — passed.
- GitHub Actions — all eight checks passed, including build and the new marketing-contract validation.

### Boundaries And Next Steps

- This gate defines and validates the campaign control plane; it does not authenticate X or publish content.
- Review and merge PR #174. Merge roadmap PR #173 when its documentation review is complete.
- Continue with Gate 2: wire the declared attribution and privacy-safe events into the runtime.
- Only after runtime evidence is in place, complete X OAuth and publish one manually approved smoke post.
- Treat a post as published only when OmniPost retains the provider post ID, public URL, publish timestamp, and audit event.

---

## 2026-07-18 Operations Handoff

### Current State

- **Production-like dev URL:** `https://omnipost.neuralliquid.ai`
- **Azure default URL:** `https://nl-dev-omnipost-web.azurewebsites.net`
- **Health endpoint:** `https://omnipost.neuralliquid.ai/api/health`
- **Health result:** `200 OK`, body includes `{"status":"healthy","environment":"production"}`
- **Git branch:** `main`
- **Latest deployed commit:** `bce58a4c853645ea84635bdbe91338235bfce3bf`
- **Deployment run:** <https://github.com/neuralliquid/omnipost/actions/runs/29620005585> completed successfully

### What Changed In This Recovery

- PR #135 selected the correct Azure subscription in deploy workflows.
- GitHub secret `AZURE_CREDENTIALS` was replaced with a service principal for subscription `bb4e3882-2079-4bab-8974-611bc0b8bb58`.
- PR #137 changed the Azure Web App resource name from `nl-*-omnipost-app` to `nl-*-omnipost-web` to avoid a global App Service name collision while keeping region out of resource names.
- PR #137 also updated app URL fallbacks, Azure secret docs, deployment summary output, and `NEXT_PUBLIC_SITE_URL`.
- PR #138 removed an unused `region` parameter from `infra/monitoring.bicep`; this stopped `azure/arm-deploy` from failing because a Bicep linter warning was written to stderr.
- Azure DNS for `omnipost.neuralliquid.ai` now points to `nl-dev-omnipost-web.azurewebsites.net`.
- Azure App Service custom hostname binding is configured for `omnipost.neuralliquid.ai`.
- Managed certificate is created and bound with SNI.
- DNS ownership moved to `neuralliquid-org` Terraform.
- Live Omnipost dev runtime was imported into `infra/terraform/env/dev` with `9 imported, 0 added, 0 changed, 0 destroyed`.
- Active runtime infrastructure validation now runs through Terraform. The
  legacy production Bicep workflow is retained but hard-disabled.
- Key Vault and Sluice gateway are modeled as live Terraform resources.
- PostgreSQL is live in Terraform for Sluice LiteLLM persistence:
  `nl-dev-omnipost-psql-swc` in Sweden Central with database `omnipost`.
- Sluice gateway is live at
  `https://nl-dev-omnipost-sluice.jollyfield-e2805f37.westeurope.azurecontainerapps.io`;
  Omnipost Web App settings include `SLUICE_GATEWAY_URL` and `SLUICE_API_KEY`.

### Azure Resources

| Resource         | Value                                       |
| ---------------- | ------------------------------------------- |
| Subscription     | `bb4e3882-2079-4bab-8974-611bc0b8bb58`      |
| Tenant           | `9530cd32-9e33-47f0-9247-ed964730b580`      |
| Resource group   | `nl-dev-omnipost-rg`                        |
| Web App          | `nl-dev-omnipost-web`                       |
| App Service Plan | `nl-dev-omnipost-asp`                       |
| DNS zone         | `neuralliquid.ai` in `mys-global-shared-rg` |
| Custom hostname  | `omnipost.neuralliquid.ai`                  |
| SSL thumbprint   | `0A28D1D1C8B76B16744288187F084ED7135D9F35`  |

### Verification Commands

```bash
curl -I https://omnipost.neuralliquid.ai/api/health
curl -I https://nl-dev-omnipost-web.azurewebsites.net/api/health
gh run view 29620005585 --repo neuralliquid/omnipost --json conclusion,status,url,headSha
```

Expected:

- `conclusion: success`
- HTTP `200 OK` for both health endpoints

### Remaining Alpha Readiness Work

- Configure required app secrets on `nl-dev-omnipost-web`. Current deployed settings include platform/runtime settings, but not `JWT_SECRET` or optional integration secrets.
- Use `/health/readiness` as the Sluice health signal; readiness should report
  `db: "connected"` for the database-backed LiteLLM gateway.
- Keep the existing managed certificate Azure-managed until a no-replacement
  Terraform import can be proven.
- Follow up on non-blocking CI annotations:
  - GitHub Actions Node 20 deprecation warnings for pinned actions.
  - Existing lint warnings emitted during build annotations, though CI is passing.
- If alpha needs login/signup beyond health, set `JWT_SECRET` first and smoke-test `/signup`, `/login`, and protected dashboard routes.

---

## Historical March 2026 Alpha Build Handoff

**Branch**: `claude/review-repo-structure-9D1gP`
**Date**: 2026-03-30
**Commits**: 59 on branch
**Scope**: 181 files changed, 21,058 lines added, 1,211 removed

---

## What Was Built

### Infrastructure Layer

| Component                | Files                                                      | Purpose                                                                                                           |
| ------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Sluice AI Gateway**    | `lib/clients/sluice-gateway.ts`, `infra/terraform/env/dev` | OpenAI-compatible proxy for centralized AI cost tracking, model routing, failover. Feature-flagged (`aiGateway`). |
| **Azure PostgreSQL**     | `infra/terraform/env/dev`                                  | Live Terraform-managed Sluice LiteLLM persistence in Sweden Central.                                              |
| **Retort Orchestration** | `.agentkit/spec/*.yaml`                                    | Single-source YAML spec generating configs for 16+ AI tools.                                                      |
| **Agent Rules**          | `.cursor/rules/` (10), `.windsurf/rules/` (10)             | Team-scoped coding rules for Claude, Cursor, Windsurf, Copilot.                                                   |
| **Baton**                | `lib/integrations/baton.ts`                                | MCP client for task management + org context (proxies mcp-org). Feature-flagged (`baton`). Formerly phoenix-flow. |

### Application Layer

| Component             | Files                                                                                | Purpose                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Auth Middleware**   | `middleware.ts`                                                                      | JWT validation → header injection for all API/dashboard routes.                                                          |
| **External Identity** | `lib/auth/identity-provider.ts`, `app/api/auth/providers/`, `app/api/auth/callback/` | Social login abstraction (Google, GitHub, etc.) via external identity API. Feature-flagged (`externalIdentityProvider`). |
| **User Persistence**  | `app/api/auth/route.ts`, `prisma/schema.prisma`                                      | Registration/login backed by Prisma/PostgreSQL (replaced in-memory Map).                                                 |
| **Analytics**         | `lib/analytics/`, `app/api/analytics/events/`, `hooks/useAnalytics.ts`               | AARRR event tracking with batched client tracker, wired into all pages.                                                  |
| **Content Creation**  | `app/(dashboard)/content/new/`, `app/(dashboard)/content/`                           | Write → adapt per platform → schedule/publish flow.                                                                      |
| **Task Board**        | `app/(dashboard)/tasks/`, `app/api/tasks/`                                           | Kanban board connected to baton MCP.                                                                                     |
| **Platform Settings** | `app/(dashboard)/settings/platforms/`                                                | Connect/disconnect platforms with mock OAuth (real OAuth ready).                                                         |

### Marketing Layer

| Component               | Files                                          | Purpose                                                                |
| ----------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| **34 Marketing Skills** | `.agents/skills/*/SKILL.md`                    | CRO (7), content (6), SEO (6), growth (11), analytics (4).             |
| **Product Context**     | `.agents/context/product-marketing-context.md` | Foundational product positioning all skills reference.                 |
| **Tool Registry**       | `.agents/context/tool-registry-overlay.md`     | Maps 80+ MarketingSkills tools to OmniPost integrations.               |
| **Launch Assets**       | `docs/launch/`                                 | Blog post, 10+ social posts, email, Product Hunt brief, press release. |

### Frontend

| Page              | Route                 | Type                                             |
| ----------------- | --------------------- | ------------------------------------------------ |
| Landing (CRO)     | `/`                   | Server component, hero + features + social proof |
| Pricing           | `/pricing`            | Client, 3 tiers + FAQ + billing toggle           |
| Signup            | `/signup`             | Client, social login + email, password strength  |
| Login             | `/login`              | Client, social login + email                     |
| Onboarding        | `/onboarding`         | Client, 3-step guided flow with persistence      |
| Dashboard         | `/dashboard`          | Client, metrics + Airtable                       |
| Content List      | `/content`            | Client, draft/scheduled/published list           |
| Content Create    | `/content/new`        | Client, write → adapt → schedule                 |
| Tasks             | `/tasks`              | Client, Kanban board (baton)                     |
| Settings          | `/settings`           | Client, settings hub                             |
| Platform Settings | `/settings/platforms` | Client, connect/disconnect platforms             |

### Quality

| Area             | Count          | Details                                                             |
| ---------------- | -------------- | ------------------------------------------------------------------- |
| Unit tests       | 22 files       | Analytics, sluice, middleware, scheduler, UI components, API routes |
| E2E tests        | 4 suites       | Auth flow, content creation, navigation, pricing                    |
| Pre-commit hooks | 2              | lint-staged + conventional commits (husky)                          |
| CI pipeline      | 5 steps        | type-check → lint → test → format → validate-skills                 |
| Design system    | 42 CSS modules | Custom properties, dark mode, reduced-motion, focus-visible         |

---

## Feature Flags

| Flag                       | Default | Controls                                                |
| -------------------------- | ------- | ------------------------------------------------------- |
| `aiGateway`                | `false` | Sluice AI gateway routing                               |
| `externalIdentityProvider` | `false` | Social login via external identity API                  |
| `baton`                    | `false` | Task board + org context via MCP (formerly phoenixFlow) |
| `textParser`               | `true`  | AI text parsing (OpenAI/DeepSeek/Azure)                 |
| `imageGeneration`          | `true`  | AI image generation (HuggingFace/DALL-E)                |
| `summarization`            | `true`  | AI text summarization                                   |
| `leadManagement`           | `true`  | CRM lead management                                     |
| `outreachSequences`        | `true`  | Email/LinkedIn sequences                                |
| `crmDashboard`             | `true`  | CRM analytics dashboard                                 |

---

## Environment Variables Required

```bash
# Required
JWT_SECRET=<generate with: openssl rand -base64 32>
DATABASE_URL=file:./dev.db  # or postgresql:// for Azure

# Optional — AI Services
OPENAI_API_ENDPOINT=
DEEPSEEK_API_ENDPOINT=
HUGGINGFACE_API_KEY=

# Optional — Sluice Gateway
SLUICE_GATEWAY_URL=
SLUICE_API_KEY=

# Optional — External Identity
IDENTITY_API_URL=
IDENTITY_API_KEY=

# Optional — Baton (formerly phoenix-flow)
BATON_MCP_URL=
BATON_MCP_SECRET=

# Optional — Platforms
FACEBOOK_API_KEY=
INSTAGRAM_API_KEY=
TIKTOK_API_KEY=
TIKTOK_PRIVACY_LEVEL=SELF_ONLY
LINKEDIN_API_KEY=
TWITTER_ACCESS_TOKEN=
```

---

## Setup Instructions

```bash
git clone https://github.com/phoenixvc/omnipost.git
cd omnipost
git checkout claude/review-repo-structure-9D1gP
pnpm install
pnpm db:generate
pnpm db:push
cp .env.example .env.local
# Edit .env.local — set JWT_SECRET at minimum
pnpm dev
# Open http://localhost:3000
```

### Verify

```bash
pnpm check-all              # lint + typecheck + format + test
bash .agents/validate-skills.sh  # validate 34 marketing skills
pnpm test:e2e               # Playwright E2E tests (needs running dev server)
```

---

## Security Posture

| Control       | Implementation                                            |
| ------------- | --------------------------------------------------------- |
| Auth          | JWT middleware → header injection, bcryptjs hashing       |
| XSS           | DOMPurify + Zod validation + HTML escaping on client      |
| Rate limiting | Upstash Redis (prod) / in-memory with safe eviction (dev) |
| CSRF          | SameSite=strict cookies                                   |
| CSP           | Tightened headers, no unsafe-eval, connect-src whitelist  |
| Ownership     | Leads/forms routes verify resource belongs to user        |
| Secrets       | Timing-safe comparison for CRON_SECRET                    |
| Audit         | Audit trail for auth events and significant analytics     |

---

## Known Limitations (Alpha Scope)

| Limitation                          | Mitigation                                  | Post-Alpha Plan                      |
| ----------------------------------- | ------------------------------------------- | ------------------------------------ |
| Platform connections are mock       | Settings page UI ready, mock toggle         | Wire real OAuth per platform         |
| No payment processing               | Pricing page shows tiers, CTAs go to signup | Integrate Stripe                     |
| Content publishing is simulated     | Scheduler creates jobs, adapters are stubs  | Implement platform API adapters      |
| Email sequences not triggered       | Sequence engine exists, no cron trigger     | Add cron job for sequence processing |
| In-memory fallbacks for some stores | Feature-flagged, Prisma primary             | Remove fallbacks post-migration      |

---

## Ecosystem Integrations

| System               | Status            | Connection                                                          |
| -------------------- | ----------------- | ------------------------------------------------------------------- |
| **Retort**           | Active            | `.agentkit/spec/` → generates agent configs                         |
| **MarketingSkills**  | Active            | 34 skills in `.agents/skills/`, validated                           |
| **Sluice**           | Live              | `lib/clients/sluice-gateway.ts` + `infra/terraform/env/dev`         |
| **Baton**            | Ready (flag off)  | `lib/integrations/baton.ts` + task board UI (formerly phoenix-flow) |
| **mcp-org**          | Ready (via baton) | Org context proxied through baton MCP                               |
| **Azure PostgreSQL** | Live              | `infra/terraform/env/dev`; Sluice LiteLLM persistence database      |

---

## Files to Review First

For a quick understanding of the codebase:

1. `CLAUDE.md` — Agent entry point, architecture overview
2. `docs/GETTING_STARTED.md` — Setup guide
3. `docs/ALPHA_LAUNCH_PLAN.md` — Launch strategy and status
4. `CHANGELOG.md` — [1.0.0-alpha] entry covers everything
5. `.agentkit/spec/project.yaml` — Retort project spec
6. `middleware.ts` — Auth flow entry point

---

## Metrics

| Metric           | Value                                    |
| ---------------- | ---------------------------------------- |
| Commits          | 59                                       |
| Files changed    | 181                                      |
| Lines added      | 21,058                                   |
| Lines removed    | 1,211                                    |
| API routes       | 39                                       |
| Pages            | 19                                       |
| Test files       | 28 (22 unit + 4 E2E + 2 fixtures)        |
| Marketing skills | 34                                       |
| CSS modules      | 42                                       |
| Agent rules      | 20 (10 Cursor + 10 Windsurf)             |
| Feature flags    | 11                                       |
| Bicep templates  | 9                                        |
| Launch assets    | 5                                        |
| Bugs fixed       | 6 (BUG-04, 06, 07, 08, 09, + rate limit) |
| Security fixes   | 8 (XSS, timing, ownership, CSP, auth)    |
