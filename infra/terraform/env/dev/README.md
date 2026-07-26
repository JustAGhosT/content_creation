# Omnipost Dev Terraform

This stack owns the live Omnipost production-like dev runtime.

DNS records for `omnipost.neuralliquid.ai` are owned by
`neuralliquid-org/infra/terraform/dns`.

## Backend

- resource group: `nl-org-tfstate-rg`
- storage account: `nlorgtfstate`
- container: `tfstate`
- key: `products/omnipost/dev.tfstate`

## Managed Resources

- `nl-dev-omnipost-rg`
- `nl-dev-omnipost-asp`
- `nl-dev-omnipost-web`
- `nl-dev-omnipost-law`
- `nl-dev-omnipost-ai`
- Omnipost metric alerts
- `omnipost.neuralliquid.ai` hostname binding
- `nl-dev-omnipost-kv`
- `nl-dev-omnipost-cae`
- `nl-dev-omnipost-sluice`
- `nl-dev-omnipost-scheduler` recurring Container Apps Job
- `nl-dev-omnipost-psql-swc` in `swedencentral`
- PostgreSQL database `omnipost`

The scheduler job runs once every two minutes with no platform-level retry. It reads a
versionless processor secret through managed identity and invokes the protected
OmniPost processor. Durable leases and reconciliation state remain the authority
for retries and unknown provider outcomes.

The existing App Service managed certificate remains live in Azure but is not
managed by this first Terraform pass because importing it as
`azurerm_app_service_managed_certificate` forced replacement in the provider
plan. Leave it Azure-managed until a no-replacement import can be proven.

## Secret Inputs

Sluice requires these secret variables at plan/apply time:

- `TF_VAR_sluice_azure_openai_endpoint`
- `TF_VAR_sluice_azure_openai_api_key`
- `TF_VAR_sluice_api_key`

The GitHub workflow maps those from repository/environment secrets named
`SLUICE_AZURE_OPENAI_ENDPOINT`, `SLUICE_AZURE_OPENAI_API_KEY`, and
`SLUICE_API_KEY`. The dev repo secrets are configured.

## Bicep Status

The active dev runtime path is Terraform. Legacy Bicep deployment is retained
only as a disabled workflow path during quick iteration.

## Commands

```bash
terraform -chdir=infra/terraform/env/dev init
terraform -chdir=infra/terraform/env/dev validate
terraform -chdir=infra/terraform/env/dev plan
```
