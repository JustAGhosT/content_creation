# OmniPost Alpha — Handoff Document

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
