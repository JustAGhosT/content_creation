# OmniPost release evidence audit

Audit date: 2026-08-09

This audit is the OmniPost pilot input to Baton task
`6ed39c8a-86f8-4599-a7be-e506dd637e3b`. It does not define the canonical
cross-organization event schema and does not send Discord messages.

## Current authority

- Portfolio and product: NeuralLiquid / OmniPost
- Repository: `neuralliquid/omnipost` (active)
- Default branch: `main`
- Authoritative version source: `package.json`; currently `1.0.0`
- Runtime target: Azure App Service `nl-dev-omnipost-web`
- Current deployment environment: `dev` (documented as production-like, not
  production)
- Active application workflow: `.github/workflows/azure-webapps-node.yml`
- Infrastructure source: `infra/terraform/env/dev`

## Findings

1. The package version is static. There is no conventional-commit bump policy,
   protected release PR automation, or current immutable tag/GitHub Release
   flow. The only listed GitHub Release predates the current deployment model.
2. A push to `main` starts the dev deployment workflow. A successful merge or
   build is not deployment evidence; the deploy and post-deploy acceptance
   steps must both succeed.
3. Before this pilot the health endpoint reported a version but not the source
   commit or build timestamp, so a central read-only collector could not prove
   that a successful health response represented the workflow SHA.
4. There is no repository scheduled Discord digest. No Discord webhook or
   portfolio marker belongs in this product repository.
5. Deployment rollback was not tied to an exact runtime revision. The supported
   procedure is now to redeploy a previously verified commit and confirm the
   same commit through the health endpoint.

## Pilot contract

The standalone artifact embeds `version`, `commit`, `builtAt`, and
`environment`. `/api/health` exposes those non-secret fields. The deployment
workflow accepts a deployment only when the live commit equals `github.sha` and
the version and build timestamp are present.

The successful GitHub Actions deployment run supplies the evidence URL and
publication timestamp. The repository and workflow SHA supply immutable source
identity. Acceptance is `passed` only after the exact-SHA health check succeeds;
otherwise it is `failed` or `unknown` and must not enter a shipped rollup.

## Central collector boundary

`neuralliquid-org` owns the NeuralLiquid Discord secret, schedule, read-only
source access, state, and the independent `nl/omnipost/weekly` Monday window.
OmniPost remains authoritative for its version, deployed SHA, environment,
deployment result, health evidence, and rollback procedure. The central
collector must never infer shipment from merged pull requests.

The shared `org-meta` schema and compatibility policy must be finalized before
OmniPost emits a schema-versioned event payload. This pilot deliberately avoids
creating a competing product-local schema.

## Remaining standardization work

- Choose and protect the version bump and release PR mechanism.
- Create immutable tags, GitHub Releases, and changelogs for releasable builds.
- Have the owner-repository collector normalize successful deployment evidence
  into the canonical schema after that schema is approved.
- Prove dry-run replay and duplicate suppression in `neuralliquid-org` before
  enabling the Monday collector or changing any legacy notification.
