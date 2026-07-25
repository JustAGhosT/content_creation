# Azure Deployment Plan

> **Status:** Deployed

Generated: 2026-07-25

---

## 1. Project Overview

**Goal:** Close OmniPost Gate 2's production persistence gap and deliver the
first Gate 3 slice by replacing packaged SQLite runtime state with an isolated,
durable PostgreSQL data plane, controlled migrations, Key Vault-backed
configuration, and restart-persistence evidence.

**Path:** Add Components (MODIFY)

This plan deliberately excludes OAuth lifecycle, the durable publish queue,
recurring processing, and provider reconciliation. Those remain subsequent
Gate 3 slices and separate pull requests.

---

## 2. Requirements

| Attribute         | Value                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classification    | Development / controlled evidence environment on a public production-like endpoint                                                                |
| Scale             | Small, under 1,000 users during the evidence pilot                                                                                                |
| Budget            | Cost-optimized, with isolation favored over sharing Sluice's database                                                                             |
| Compliance        | Privacy-safe campaign evidence, tenant isolation, least privilege, secret-free logs; no additional formal residency requirement has been declared |
| Subscription      | Azure subscription 1 (`bb4e3882-2079-4bab-8974-611bc0b8bb58`) — requires user confirmation                                                        |
| Web location      | West Europe (existing App Service and Key Vault) — requires user confirmation                                                                     |
| Database location | North Europe — lowest-priced supported European B1ms region in the current Microsoft retail catalog                                               |

### Guardrails

- Do not point OmniPost at the existing `omnipost` database used by
  Sluice/LiteLLM.
- Do not expose a database URL or password in GitHub logs, Terraform output,
  application telemetry, Baton, or documentation.
- Use committed PostgreSQL migrations and `prisma migrate deploy`; do not use
  `prisma db push` against Azure.
- Inventory the current deployed SQLite database before cutover. If it contains
  real user or campaign rows, pause for an explicit data-migration decision
  rather than silently discarding them.
- Deployment and any RBAC modification occur only after preparation,
  validation, and explicit deployment authorization.

---

## 3. Components Detected

| Component            | Type                        | Technology                                   | Path                                             |
| -------------------- | --------------------------- | -------------------------------------------- | ------------------------------------------------ |
| OmniPost web/API     | SSR web application and API | Next.js 16, React 19, TypeScript             | `app/`, `components/`, `lib/`                    |
| Campaign persistence | Relational data access      | Prisma ORM 7.1, currently SQLite             | `prisma/`, `lib/db/`, `lib/campaigns/`           |
| Deployment pipeline  | CI/CD                       | GitHub Actions, Azure Web Apps deploy        | `.github/workflows/azure-webapps-node.yml`       |
| Azure infrastructure | Infrastructure as code      | Terraform AzureRM                            | `infra/terraform/env/dev/`                       |
| Runtime host         | Existing service            | Azure Linux App Service B1                   | `nl-dev-omnipost-web`                            |
| Secrets              | Existing service            | Azure Key Vault with managed identity access | `nl-dev-omnipost-kv`                             |
| Monitoring           | Existing services           | Application Insights and Log Analytics       | `nl-dev-omnipost-ai`, `nl-dev-omnipost-law`      |
| Sluice data plane    | Existing sibling dependency | PostgreSQL 16 B1ms; must remain isolated     | `nl-dev-omnipost-psql-swc` / database `omnipost` |

No Copilot SDK, Azure Functions, or cross-cloud migration trigger was detected.

---

## 4. Recipe Selection

**Selected:** Existing Terraform plus GitHub Actions

**Rationale:**

- The live resources are already imported into
  `infra/terraform/env/dev`.
- The established workflow validates Terraform before deploying App Service.
- Introducing AZD in this bounded migration would create a second environment
  and state-management convention.
- Application and infrastructure changes can remain one reviewable, reversible
  cutover slice.

---

## 5. Architecture

**Stack:** Existing Azure App Service with a dedicated Azure Database for
PostgreSQL Flexible Server.

### Service Mapping

| Component                     | Azure Service                                   | SKU / configuration                                                                               |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| OmniPost web/API              | Existing Linux App Service                      | B1; no scale change                                                                               |
| OmniPost relational state     | New PostgreSQL Flexible Server                  | PostgreSQL 16, Burstable B1ms, 32 GiB, 7-day backup, North Europe, no HA for controlled dev pilot |
| OmniPost application database | PostgreSQL database on the dedicated server     | `omnipost_app`, UTF-8                                                                             |
| Runtime database secret       | Existing Key Vault                              | One versioned connection secret, referenced by App Service                                        |
| Schema deployment             | GitHub Actions                                  | OIDC, `prisma migrate deploy`, then application deployment                                        |
| Observability                 | Existing Application Insights and Log Analytics | No new workspace                                                                                  |

### Data Flow

1. Terraform creates a dedicated PostgreSQL server and `omnipost_app`
   database, separate from Sluice.
2. Terraform stores the generated connection URL as a Key Vault secret and
   gives only the required identities secret-read access.
3. App Service receives a Key Vault reference, not a plaintext URL committed
   to source.
4. The deployment workflow applies committed PostgreSQL migrations before
   deploying the application package.
5. Prisma 7 uses `@prisma/adapter-pg`; CI uses an ephemeral PostgreSQL service
   database rather than packaged SQLite.
6. Runtime verification creates an authenticated campaign, reloads it, restarts
   the App Service, and confirms campaign, version, approval, and audit history
   still reconcile.

### Security Decisions

- Dedicated server prevents application credentials from granting access to
  Sluice/LiteLLM data.
- TLS is required in the PostgreSQL connection.
- Key Vault purge protection will not be disabled.
- No public database credential is emitted as a Terraform output.
- Public networking remains a temporary controlled-dev constraint; private
  networking is a later hardening slice because the existing App Service B1
  topology has no VNet integration.

---

## 6. Provisioning Limit Checklist

### Evidence

- Azure quota tooling returned `No SKU available` for
  `Microsoft.DBforPostgreSQL/flexibleServers`; the provider does not expose a
  usable numeric quota through that interface for this request.
- Azure's subscription-aware SKU inventory confirms North Europe offers
  `Standard_B1ms`, PostgreSQL 16, and zones 1–3 with no offer restriction.
- The Microsoft retail catalog on 2026-07-25 prices North Europe Basic compute
  at USD 0.018/hour and storage at USD 0.1265/GB-month: approximately USD 17.19
  per 730-hour month with 32 GB before backup overage and transfer.
- East US is the absolute catalog minimum at approximately USD 16.09/month, but
  the roughly USD 1.10/month saving would put every database query across the
  Atlantic and introduce transfer-cost and latency risk. North Europe is
  therefore the lowest-cost operationally credible region for the West Europe
  web app.
- The only subscription policy assignment is the Azure Security Center default
  audit initiative; it does not deny this architecture.

| Resource Type                                         | Number to Deploy |                              Total After Deployment | Limit / quota                                                                                | Notes                                          |
| ----------------------------------------------------- | ---------------: | --------------------------------------------------: | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `Microsoft.DBforPostgreSQL/flexibleServers`           |                1 |                2 in the resource group/subscription | Quota API has no numeric SKU result; subscription SKU inventory exposes B1ms in North Europe | Final capacity checked by Terraform plan/apply |
| `Microsoft.DBforPostgreSQL/flexibleServers/databases` |                1 | 2 application databases across two isolated servers | Child resource; no regional quota exposed                                                    | One database per server                        |
| `Microsoft.KeyVault/vaults/secrets`                   |                1 |                           Existing secret count + 1 | No regional provisioning quota; each secret value max 25 KB                                  | Connection URL is well below 25 KB             |
| `Microsoft.Web/sites`                                 |                0 |                                                   1 | No new site capacity required                                                                | Existing App Service only                      |

**Status:** ✅ No published child-resource limit is approached. ⚠️ PostgreSQL
SKU capacity is not reservable and must pass the non-destructive Terraform plan
and deployment validation.

---

## 7. Execution Checklist

### Research Summary

- Prisma 7 PostgreSQL requires `@prisma/adapter-pg` with `PrismaPg` at
  runtime; production schema changes use committed migrations and
  `prisma migrate deploy`.
- The existing SQLite migration history cannot be reused as PostgreSQL
  migration history. It will be preserved under an explicit archive path,
  while a new PostgreSQL baseline represents the complete current schema.
- Azure App Service supports a versionless Key Vault reference in a
  `PostgreSQL` connection-string block. The Node runtime receives that value
  as `POSTGRESQLCONNSTR_DATABASE_URL`, so application configuration will
  accept that Azure name as a fallback to local `DATABASE_URL`.
- A user-assigned managed identity will be attached to the existing web app
  and selected for Key Vault reference resolution. Existing Log Analytics
  will receive App Service diagnostic logs.
- The dedicated server uses PostgreSQL 16, `B_Standard_B1ms`, 32 GiB,
  seven-day backup retention, TLS, and the Azure-services firewall rule
  required by the current public App Service topology.
- North Europe is the cheapest supported European B1ms region verified for
  this subscription. It avoids sharing credentials or blast radius with the
  existing Sluice PostgreSQL server.

### Phase 1: Planning

- [x] Analyze workspace
- [x] Gather requirements from the approved roadmap and live environment
- [x] Confirm subscription and locations with user
- [x] Prepare resource inventory
- [x] Check quota interface, live resource count, regional availability, and policies
- [x] Scan codebase
- [x] Select recipe
- [x] Plan architecture
- [x] User approved this plan on 2026-07-25, requesting the cheapest credible database region

### Phase 2: Execution

- [x] Research PostgreSQL, App Service, Key Vault, and Prisma components
- [x] Generate Terraform and application configuration
- [x] Create a PostgreSQL baseline migration while preserving SQLite history
- [x] Replace production `db push` and packaged SQLite with `migrate deploy`
- [x] Add PostgreSQL-backed CI and restart-persistence tests
- [x] Harden secret, TLS, managed-identity, and fail-closed behavior
- [x] Update this plan status to `Ready for Validation`

### Phase 3: Validation

- [x] Invoke the `azure-validate` skill
- [x] Run Prisma generation, migration validation, project quality checks, and build
- [x] Run `terraform fmt`, `terraform validate`, and a non-destructive plan
- [x] Confirm no planned deletion or replacement of existing resources
- [x] Update status to `Validated` and record proof

### Phase 4: Deployment

- [x] Invoke the `azure-deploy` skill
- [x] Obtain explicit approval for cost, RBAC, and cutover
- [x] Inventory existing SQLite rows before switching `DATABASE_URL`
- [x] Apply Terraform and migrations
- [x] Deploy the application
- [x] Verify health plus authenticated create/reload/restart/audit persistence
- [ ] Record deployment SHA, workflow, Azure resources, residual risk, and Baton closeout
- [x] Update status to `Deployed`

---

## 8. Validation Proof

| Check                  | Command Run                                                         | Result                                                                                           | Timestamp             |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------- |
| Prisma client          | `prisma generate`                                                   | Passed with Prisma 7.1 PostgreSQL client                                                         | 2026-07-25 17:00 SAST |
| PostgreSQL baseline    | `pnpm run db:migrate:deploy` against PostgreSQL 16 Docker           | One baseline migration applied successfully                                                      | 2026-07-25 17:06 SAST |
| Restart persistence    | Targeted PostgreSQL integration test                                | Passed; immutable campaign, approval, attribution, and tenant boundaries survived client restart | 2026-07-25 17:06 SAST |
| Type and lint          | `pnpm run type-check`; `pnpm run lint`                              | Type check passed; lint passed with 120 pre-existing warnings and zero errors                    | 2026-07-25 17:08 SAST |
| Formatting             | Repository-wide Prettier check with `--end-of-line auto`            | Passed; Windows checkout line endings accounted for                                              | 2026-07-25 17:14 SAST |
| Tests                  | `pnpm test -- --runInBand` against PostgreSQL 16                    | 34 suites and 241 tests passed                                                                   | 2026-07-25 17:12 SAST |
| Production build       | `pnpm run build`                                                    | Next.js 16 production build passed                                                               | 2026-07-25 17:09 SAST |
| Terraform tools/auth   | `terraform version`; `az version`; `az account show`                | Terraform 1.14.7, Azure CLI 2.81.0, expected enabled subscription and tenant                     | 2026-07-25 17:13 SAST |
| Terraform syntax/state | `terraform fmt -check -recursive`; `terraform validate`; state list | Passed; remote state accessible                                                                  | 2026-07-25 17:13 SAST |
| Terraform preview      | `terraform plan -var-file=main.tfvars.json`                         | 12 add, 3 in-place, 0 destroy; no replacement or deletion                                        | 2026-07-25 17:10 SAST |
| Azure policy           | Azure Policy assignment validation                                  | Only Security Center's audit-only default initiative applies; no deny policy blocks the design   | 2026-07-25 17:13 SAST |
| Live SQLite inventory  | Kudu package `20260725115316.zip`; `sqlite3` row counts             | All 19 application tables contain zero rows; no data migration is required                       | 2026-07-25 17:26 SAST |

The local Terraform preview used masked placeholder values for the three
required Sluice inputs, so it displayed an in-place Sluice secret refresh.
Deployment must use the real protected values and must reject any residual
Sluice change before apply. The Gate 3 resources themselves require no
destructive action.

**Validated by:** `azure-validate` on 2026-07-25

---

## 9. Deployment Proof

| Check                     | Evidence                                                                                                   | Result                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Infrastructure apply      | Terraform apply on 2026-07-25                                                                              | 12 added, 2 changed, 0 destroyed                                                       |
| Cost controls             | `nl-dev-omnipost-psqlf-app` live configuration                                                             | North Europe, Burstable B1ms, 32 GiB, 7-day backup, no HA, no geo-redundant backup     |
| Database migration        | GitHub Actions run `30164870954`, SHA `a8876a19b1048bee8ec8f1635cd643474cc3985d`                           | PostgreSQL baseline applied before package deployment                                  |
| Application deployment    | GitHub Actions run `30164870954`                                                                           | Build, infrastructure plan, migration, Web App deployment, and automated health passed |
| Key Vault resolution      | App Service connection-string reference status                                                             | `Resolved` through user-assigned identity; no plaintext application setting            |
| Authenticated persistence | Production registration, canonical import, read, audit, App Service restart, then read/audit on 2026-07-25 | Version 1 and snapshot hash stable; one audit version and three attribution links      |

The first deployed reference used the secret's ARM resource ID and App Service
reported `InvalidSyntax`. PR #180 changes the expression to the provider's
versionless vault URI. The corrected live plan updated the Web App in place
with 0 additions and 0 destroys, after which App Service reported `Resolved`.

**Residual risk:** this controlled dev topology permits public PostgreSQL
network access from Azure services because the B1 App Service has no VNet
integration. Private networking and tighter application-specific database
roles remain later hardening work.

---

## 10. Files to Generate or Modify

| File                                       | Purpose                                                            | Status   |
| ------------------------------------------ | ------------------------------------------------------------------ | -------- |
| `.azure/plan.md`                           | Preparation, validation, and deployment source of truth            | Created  |
| `prisma/schema.prisma`                     | PostgreSQL datasource contract                                     | Complete |
| `prisma/migrations/**`                     | New committed PostgreSQL baseline/history                          | Complete |
| `lib/db/prisma.ts`                         | Prisma 7 PostgreSQL adapter and fail-closed configuration          | Complete |
| `package.json`, `pnpm-lock.yaml`           | PostgreSQL adapter dependencies and scripts                        | Complete |
| `.github/workflows/ci.yml`                 | Ephemeral PostgreSQL CI service and generated client               | Complete |
| `.github/workflows/azure-webapps-node.yml` | Production migration and package corrections                       | Complete |
| `infra/terraform/env/dev/*.tf`             | Dedicated database server, database, secret, and runtime reference | Complete |
| `docs/HANDOFF.md`                          | Gate 2 production closeout and Gate 3 continuation evidence        | Complete |

---

## 11. Next Steps

> Current: deployed and restart-persistence verified.

1. Reconcile the Gate 3 deployment evidence and remaining slices in Baton.
2. Continue Gate 3 in separate PRs for X OAuth lifecycle, durable queue leases,
   recurring processing, retry/dead-letter handling, rate limits, and provider
   reconciliation.
