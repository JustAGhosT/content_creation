# Azure App Settings Configuration Guide

This document explains how to configure environment variables and secrets for the Azure App Service deployment.

## Overview

The application requires several environment variables and secrets to function properly. These are configured as **Azure App Settings** in the App Service, which become environment variables at runtime.

## Required Secrets

### 🔐 Critical (Required for Core Functionality)

#### JWT_SECRET

- **Purpose:** Signs and verifies JWT authentication tokens
- **Type:** Random string (min 32 characters)
- **How to Generate:**
  ```bash
  # Generate a secure random string
  openssl rand -base64 32
  ```
- **How to Set:**
  ```bash
  az webapp config appsettings set \
    --name nl-dev-omnipost-web \
    --resource-group nl-dev-omnipost-rg \
    --settings JWT_SECRET="your-generated-secret-here"
  ```

## Optional Integration Secrets

Configure these only if you're using the respective integrations:

### Airtable (Content Storage)

```bash
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings \
    AIRTABLE_API_KEY="your-api-key" \
    AIRTABLE_BASE_ID="your-base-id" \
    AIRTABLE_TABLE_NAME="your-table-name"
```

### Hugging Face (AI Image Generation)

```bash
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings HUGGING_FACE_API_KEY="your-api-key"
```

### Email (Gmail SMTP)

```bash
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings \
    EMAIL_USER="your-email@gmail.com" \
    GMAIL_CLIENT_ID="your-client-id" \
    GMAIL_CLIENT_SECRET="your-client-secret" \
    GMAIL_REFRESH_TOKEN="your-refresh-token"
```

### Slack Notifications

```bash
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings SLACK_TOKEN="xoxb-your-slack-bot-token"
```

### Twilio (SMS Notifications)

```bash
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings \
    TWILIO_ACCOUNT_SID="your-account-sid" \
    TWILIO_AUTH_TOKEN="your-auth-token" \
    TWILIO_PHONE_NUMBER="+1234567890"
```

### Social Media Platform APIs

```bash
# Facebook
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings \
    FACEBOOK_API_URL="https://graph.facebook.com" \
    FACEBOOK_API_KEY="your-api-key"

# Instagram
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings \
    INSTAGRAM_API_URL="https://graph.instagram.com" \
    INSTAGRAM_API_KEY="your-api-key"

# TikTok
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings \
    TIKTOK_API_URL="https://open.tiktokapis.com/v2/post/publish/video/init/" \
    TIKTOK_API_KEY="your-api-key" \
    TIKTOK_PRIVACY_LEVEL="SELF_ONLY"

# LinkedIn
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings \
    LINKEDIN_API_URL="https://api.linkedin.com" \
    LINKEDIN_API_KEY="your-api-key"

# Twitter/X
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings \
    TWITTER_API_URL="https://api.x.com/2/tweets" \
    TWITTER_ACCESS_TOKEN="@Microsoft.KeyVault(SecretUri=https://nl-dev-omnipost-kv.vault.azure.net/secrets/TWITTER-ACCESS-TOKEN/<version>)"
```

`TWITTER_ACCESS_TOKEN` must be an OAuth user-context token authorized for the
publishing account with `tweet.write`; an app-only bearer token is insufficient.
Create or rotate `TWITTER-ACCESS-TOKEN` through the approved secret-management
path, never in shell history or committed files. Follow
[X_CAMPAIGN_GO_LIVE.md](runbooks/X_CAMPAIGN_GO_LIVE.md) for the controlled smoke
post and rollback procedure.

### Sluice AI Gateway

The Sluice gateway is deployed as an Azure Container App. ACA hostnames include a
managed-environment hash that is allocated at deploy time and cannot be predicted
statically — fetch the FQDN after the gateway is deployed:

```bash
# Look up the actual FQDN after deploy (replace <rg> with your resource group)
SLUICE_GATEWAY_URL="https://$(az containerapp show \
  -n nl-dev-omnipost-sluice \
  -g nl-dev-omnipost-rg \
  --query properties.configuration.ingress.fqdn -o tsv)"

# Then apply it to the app settings
az webapp config appsettings set \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --settings \
    SLUICE_GATEWAY_URL="$SLUICE_GATEWAY_URL" \
    SLUICE_API_KEY="your-gateway-api-key"
```

> **Note:** The Sluice gateway is opt-in via the `aiGateway` feature flag. When enabled, AI requests are routed through the gateway for cost tracking and model abstraction. See `infra/terraform/env/dev` for infrastructure deployment.

## Configuration via Azure Portal

Alternatively, you can configure these via the Azure Portal:

1. Navigate to your App Service: `nl-dev-omnipost-web`
2. Go to **Settings** → **Configuration**
3. Click **+ New application setting**
4. Add each setting with its value
5. Click **Save** and restart the app

## Using Azure Key Vault (Recommended for Production)

For production environments, store secrets in Azure Key Vault and reference them in App Settings:

1. **Create secrets in Key Vault:**

   ```bash
   az keyvault secret set \
     --vault-name nl-prod-omnipost-kv \
     --name JWT-SECRET \
     --value "your-secret-value"
   ```

2. **Reference in App Settings:**

   ```bash
   az webapp config appsettings set \
     --name nl-prod-omnipost-web \
     --resource-group nl-prod-omnipost-rg \
     --settings JWT_SECRET="@Microsoft.KeyVault(VaultName=nl-prod-omnipost-kv;SecretName=JWT-SECRET)"
   ```

3. **Grant App Service access to Key Vault:**

   ```bash
   # Enable managed identity
   az webapp identity assign \
     --name nl-prod-omnipost-web \
     --resource-group nl-prod-omnipost-rg

   # Get the principal ID
   PRINCIPAL_ID=$(az webapp identity show \
     --name nl-prod-omnipost-web \
     --resource-group nl-prod-omnipost-rg \
     --query principalId -o tsv)

   # Grant access to Key Vault
   az keyvault set-policy \
     --name nl-prod-omnipost-kv \
     --object-id $PRINCIPAL_ID \
     --secret-permissions get list
   ```

## Verification

After setting secrets, verify they're available:

```bash
# List all app settings
az webapp config appsettings list \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --query "[].{Name:name, Value:value}" \
  --output table

# Test the health endpoint
curl https://nl-dev-omnipost-web.azurewebsites.net/api/health
```

## R13 Live Publish Readiness

The current-release posting baseline fails closed in production when provider credentials are missing. Before running a controlled publish smoke, verify the App Service has the required provider settings:

```bash
az webapp config appsettings list \
  --name nl-dev-omnipost-web \
  --resource-group nl-dev-omnipost-rg \
  --query "[?name=='FACEBOOK_API_KEY' || name=='INSTAGRAM_API_KEY' || name=='TIKTOK_API_KEY' || name=='TIKTOK_PRIVACY_LEVEL'].name" \
  --output tsv
```

Expected settings for the R13 smoke:

```text
FACEBOOK_API_KEY
INSTAGRAM_API_KEY
TIKTOK_API_KEY
TIKTOK_PRIVACY_LEVEL
```

Use `TIKTOK_PRIVACY_LEVEL=SELF_ONLY` for the first controlled TikTok smoke unless the account owner explicitly selects another creator privacy option.

## GitHub Secrets for CI/CD

The deployment pipeline needs these secrets configured in GitHub:

1. Go to **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
   - `AZURE_CREDENTIALS` - Service principal credentials for Azure login
   - `JWT_SECRET` - For running tests in CI (can be a test value)

## Security Best Practices

- ✅ **Never commit secrets to git** - Always use `.env.local` locally
- ✅ **Rotate secrets regularly** - Especially JWT_SECRET and API keys
- ✅ **Use Key Vault for production** - App Settings are fine for dev/staging
- ✅ **Limit access** - Use managed identities and minimal permissions
- ✅ **Monitor access logs** - Review Key Vault audit logs regularly

## Troubleshooting

### "Unauthorized" errors

- Verify JWT_SECRET is set and matches between environments
- Check App Service logs: `az webapp log tail --name <app-name> --resource-group <rg-name>`

### API integration failures

- Verify the specific API key is set (check logs for which integration failed)
- Test the API key directly using curl or Postman
- Ensure the API URL is correct for your region

### Secrets not loading

- Restart the App Service after changing settings
- Check for typos in secret names (they're case-sensitive in code)
- Verify managed identity has Key Vault access (if using Key Vault references)

## Reference

See [`.env.example`](../.env.example) for the complete list of supported environment variables.
