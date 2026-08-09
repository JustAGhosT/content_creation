# OmniPost Deployment

OmniPost currently runs as a production-like dev deployment on Azure App
Service.

## Live URLs

- Public URL: `https://omnipost.neuralliquid.ai`
- Azure default URL: `https://nl-dev-omnipost-web.azurewebsites.net`
- Health: `https://omnipost.neuralliquid.ai/api/health`

## Infrastructure Ownership

Product runtime is owned by this repo:

- Terraform stack: `infra/terraform/env/dev`
- State key: `products/omnipost/dev.tfstate`
- Resource group: `nl-dev-omnipost-rg`
- Web App: `nl-dev-omnipost-web`
- App Service Plan: `nl-dev-omnipost-asp`
- Observability: Log Analytics, Application Insights, metric alerts
- Hostname binding: `omnipost.neuralliquid.ai`
- Key Vault: `nl-dev-omnipost-kv`
- Sluice gateway: `nl-dev-omnipost-sluice`
- Sluice URL: `https://nl-dev-omnipost-sluice.jollyfield-e2805f37.westeurope.azurecontainerapps.io`
- PostgreSQL: `nl-dev-omnipost-psql-swc` in Sweden Central, database `omnipost`

Organization DNS is owned by `neuralliquid-org`:

- `omnipost.neuralliquid.ai` CNAME
- `asuid.omnipost` TXT validation record

Do not create or update `neuralliquid.ai` DNS records from this repo.

## Terraform Commands

```bash
terraform -chdir=infra/terraform/env/dev init
terraform -chdir=infra/terraform/env/dev validate
terraform -chdir=infra/terraform/env/dev plan
```

The current imported state has a clean plan: no changes.

The legacy production Bicep workflow is retained but disabled. Use the
Terraform dev workflow for infrastructure plan/apply while Omnipost is in quick
iteration mode.

Sluice plan/apply requires GitHub secrets:
`SLUICE_AZURE_OPENAI_ENDPOINT`, `SLUICE_AZURE_OPENAI_API_KEY`, and
`SLUICE_API_KEY`. These are configured for the current dev workflow.

## Application Deployment

Application package deployment still uses GitHub Actions and Azure Web Apps
deployment. The active workflow runs Terraform validation/plan before deploying
the app package to the existing dev Web App.

## Verification

```bash
curl -I https://omnipost.neuralliquid.ai/api/health
curl -I https://nl-dev-omnipost-web.azurewebsites.net/api/health
curl https://nl-dev-omnipost-sluice.jollyfield-e2805f37.westeurope.azurecontainerapps.io/health/readiness
```

Expected result: HTTP `200 OK`; Sluice readiness should include `db: "connected"`.

The application health payload also exposes the non-secret artifact stamp:
`version`, `commit`, `builtAt`, and `environment`. The deployment workflow does
not accept HTTP 200 alone: it verifies that the live `commit` equals the exact
GitHub Actions build SHA before the run can qualify as successful deployment
evidence. A merge, successful build, Terraform plan, or failed deployment must
not be reported as shipped.

The GitHub Actions run URL for a successful deployment is the authoritative
deployment and acceptance evidence. Roll back by redeploying a previously
verified commit through the same workflow, then verify that `/api/health`
reports that exact rollback commit. Do not change the runtime stamp separately
from the application artifact.
