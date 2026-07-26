locals {
  org         = "nl"
  environment = "dev"
  project     = "omnipost"
  region      = "euw"
  base        = "${local.org}-${local.environment}-${local.project}"

  tags = {
    org         = local.org
    environment = local.environment
    project     = local.project
    region      = local.region
    managedBy   = "bicep"
  }

  sluice_litellm_config = yamlencode({
    model_list = [
      {
        model_name = var.sluice_default_model
        litellm_params = {
          model       = "azure/${var.sluice_default_model}"
          api_base    = var.sluice_azure_openai_endpoint
          api_key     = "os.environ/LITELLM_AZURE_OPENAI_API_KEY"
          api_version = var.sluice_azure_openai_api_version
        }
      },
      {
        model_name = var.sluice_embedding_model
        litellm_params = {
          model       = "azure/${var.sluice_embedding_model}"
          api_base    = var.sluice_azure_openai_endpoint
          api_key     = "os.environ/LITELLM_AZURE_OPENAI_API_KEY"
          api_version = var.sluice_azure_openai_embedding_api_version
        }
      }
    ]
    general_settings = {
      master_key = "os.environ/LITELLM_GATEWAY_KEY"
    }
  })

  postgresql_password = var.enable_postgresql ? coalesce(var.postgresql_administrator_password, random_password.postgresql[0].result) : null
  postgresql_url = var.enable_postgresql ? format(
    "postgresql://%s:%s@%s:5432/%s?sslmode=require",
    var.postgresql_administrator_login,
    urlencode(local.postgresql_password),
    azurerm_postgresql_flexible_server.this[0].fqdn,
    var.postgresql_database_name
  ) : null

  app_postgresql_password = var.enable_app_postgresql ? coalesce(
    var.app_postgresql_administrator_password,
    random_password.app_postgresql[0].result
  ) : null
  app_postgresql_url = var.enable_app_postgresql ? format(
    "postgresql://%s:%s@%s:5432/%s?sslmode=require",
    var.app_postgresql_administrator_login,
    urlencode(local.app_postgresql_password),
    azurerm_postgresql_flexible_server.app[0].fqdn,
    var.app_postgresql_database_name
  ) : null
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_service_plan" "this" {
  name                = "${local.base}-asp"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  os_type             = "Linux"
  sku_name            = "B1"
  tags                = local.tags
}

resource "azurecaf_name" "web_key_vault_identity" {
  name          = "web-kv"
  resource_type = "azurerm_user_assigned_identity"
  prefixes      = [local.org, local.environment, local.project]
  clean_input   = true
}

resource "azurerm_user_assigned_identity" "web_key_vault" {
  name                = azurecaf_name.web_key_vault_identity.result
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tags                = merge(local.tags, { managedBy = "terraform", component = "web-key-vault-identity" })
}

resource "azurerm_linux_web_app" "web" {
  name                    = "${local.base}-web"
  resource_group_name     = azurerm_resource_group.this.name
  location                = azurerm_resource_group.this.location
  service_plan_id         = azurerm_service_plan.this.id
  https_only              = true
  client_affinity_enabled = true
  tags                    = local.tags

  identity {
    type         = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.web_key_vault.id]
  }

  key_vault_reference_identity_id = azurerm_user_assigned_identity.web_key_vault.id

  site_config {
    always_on = true
    application_stack { node_version = "20-lts" }
    app_command_line    = "node server.js"
    http2_enabled       = true
    minimum_tls_version = "1.2"
    ftps_state          = "Disabled"
    use_32_bit_worker   = true
  }

  app_settings = {
    SCM_DO_BUILD_DURING_DEPLOYMENT      = "false"
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"
    WEBSITE_NODE_DEFAULT_VERSION        = "~20"
    NODE_ENV                            = "production"
    NEXT_PUBLIC_SITE_URL                = "https://${local.base}-web.azurewebsites.net"
    PORT                                = "8080"
    WEBSITES_PORT                       = "8080"
    WEBSITE_RUN_FROM_PACKAGE            = "1"
    ENABLE_ORYX_BUILD                   = "false"
    WEBSITE_STARTUP_FILE                = "startup.sh"
    ENVIRONMENT                         = local.environment
    ORG                                 = local.org
    PROJECT                             = local.project
  }

  dynamic "connection_string" {
    for_each = merge(
      var.enable_app_postgresql && var.enable_key_vault ? {
        database = {
          name  = "DATABASE_URL"
          type  = "PostgreSQL"
          value = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.app_database_url[0].versionless_id})"
        }
      } : {},
      var.enable_key_vault ? {
        platform_token_key = {
          name  = "PLATFORM_TOKEN_ENCRYPTION_KEY"
          type  = "Custom"
          value = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.platform_token_encryption_key[0].versionless_id})"
        }
      } : {}
    )
    content {
      name  = connection_string.value.name
      type  = connection_string.value.type
      value = connection_string.value.value
    }
  }

  lifecycle {
    ignore_changes = [
      app_settings,
      logs,
      site_config,
    ]
  }
}

resource "azurerm_log_analytics_workspace" "this" {
  name                         = "${local.base}-law"
  resource_group_name          = azurerm_resource_group.this.name
  location                     = azurerm_resource_group.this.location
  sku                          = "PerGB2018"
  retention_in_days            = 30
  local_authentication_enabled = false
  tags                         = local.tags
}

resource "azurerm_monitor_diagnostic_setting" "web" {
  name                           = "${local.base}-web-diagnostics"
  target_resource_id             = azurerm_linux_web_app.web.id
  log_analytics_workspace_id     = azurerm_log_analytics_workspace.this.id
  log_analytics_destination_type = "Dedicated"

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

resource "azurerm_application_insights" "this" {
  name                = "${local.base}-ai"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  application_type    = "web"
  sampling_percentage = 0
  workspace_id        = azurerm_log_analytics_workspace.this.id
  tags                = local.tags
}

resource "azurerm_monitor_metric_alert" "high_5xx_errors" {
  name                = "${local.base}-ai-high-5xx-errors"
  resource_group_name = azurerm_resource_group.this.name
  scopes              = [azurerm_linux_web_app.web.id]
  description         = "Alert when HTTP 5xx errors exceed threshold"
  severity            = 2
  auto_mitigate       = false
  frequency           = "PT5M"
  window_size         = "PT5M"
  tags                = local.tags

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http5xx"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  lifecycle {
    ignore_changes = [criteria]
  }
}

resource "azurerm_monitor_metric_alert" "high_response_time" {
  name                = "${local.base}-ai-high-response-time"
  resource_group_name = azurerm_resource_group.this.name
  scopes              = [azurerm_linux_web_app.web.id]
  description         = "Alert when average response time exceeds 2 seconds"
  severity            = 3
  auto_mitigate       = false
  frequency           = "PT5M"
  window_size         = "PT15M"
  tags                = local.tags

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "AverageResponseTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 2
  }

  lifecycle {
    ignore_changes = [criteria]
  }
}

resource "azurerm_monitor_metric_alert" "high_memory" {
  name                = "${local.base}-ai-high-memory"
  resource_group_name = azurerm_resource_group.this.name
  scopes              = [azurerm_linux_web_app.web.id]
  description         = "Alert when memory working set exceeds 1GB"
  severity            = 3
  auto_mitigate       = false
  frequency           = "PT5M"
  window_size         = "PT15M"
  tags                = local.tags

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "MemoryWorkingSet"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 1073741824
  }

  lifecycle {
    ignore_changes = [criteria]
  }
}

resource "azurerm_app_service_custom_hostname_binding" "web" {
  hostname            = var.custom_hostname
  app_service_name    = azurerm_linux_web_app.web.name
  resource_group_name = azurerm_resource_group.this.name
}

resource "azurerm_key_vault" "this" {
  count = var.enable_key_vault ? 1 : 0

  name                            = "${local.base}-kv"
  resource_group_name             = azurerm_resource_group.this.name
  location                        = azurerm_resource_group.this.location
  tenant_id                       = data.azurerm_client_config.current.tenant_id
  sku_name                        = "standard"
  enabled_for_deployment          = false
  enabled_for_disk_encryption     = false
  enabled_for_template_deployment = true
  rbac_authorization_enabled      = true
  purge_protection_enabled        = true
  soft_delete_retention_days      = 90
  public_network_access_enabled   = true
  tags                            = merge(local.tags, { managedBy = "terraform", component = "secrets" })

  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
  }
}

resource "azurerm_role_assignment" "web_key_vault_secrets_user" {
  count = var.enable_key_vault ? 1 : 0

  scope                = azurerm_key_vault.this[0].id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.web.identity[0].principal_id
}

resource "azurerm_role_assignment" "web_identity_key_vault_secrets_officer" {
  count = var.enable_key_vault ? 1 : 0

  scope              = azurerm_key_vault.this[0].id
  role_definition_id = "/subscriptions/${var.subscription_id}/providers/Microsoft.Authorization/roleDefinitions/b86a8fe4-44ce-4948-aee5-eccb2c155cd7"
  principal_id       = azurerm_user_assigned_identity.web_key_vault.principal_id
}

resource "azurerm_role_assignment" "deployment_key_vault_secrets_officer" {
  count = var.enable_key_vault ? 1 : 0

  scope              = azurerm_key_vault.this[0].id
  role_definition_id = "/subscriptions/${var.subscription_id}/providers/Microsoft.Authorization/roleDefinitions/b86a8fe4-44ce-4948-aee5-eccb2c155cd7"
  principal_id       = var.deployment_principal_object_id
}

resource "azurerm_role_assignment" "operator_key_vault_secrets_officer" {
  count = var.enable_key_vault ? 1 : 0

  scope              = azurerm_key_vault.this[0].id
  role_definition_id = "/subscriptions/${var.subscription_id}/providers/Microsoft.Authorization/roleDefinitions/b86a8fe4-44ce-4948-aee5-eccb2c155cd7"
  principal_id       = var.operator_principal_object_id
}

resource "azurerm_container_app_environment" "sluice" {
  count = var.enable_sluice_gateway || (var.enable_scheduler_processor && var.enable_key_vault) ? 1 : 0

  name                       = "${local.base}-cae"
  resource_group_name        = azurerm_resource_group.this.name
  location                   = azurerm_resource_group.this.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  tags                       = merge(local.tags, { managedBy = "terraform", component = "sluice-gateway" })
}

resource "random_password" "scheduler_cron" {
  count = var.enable_scheduler_processor && var.enable_key_vault ? 1 : 0

  length           = 48
  special          = true
  override_special = "_%@"
}

resource "azurerm_key_vault_secret" "scheduler_cron" {
  count = var.enable_scheduler_processor && var.enable_key_vault ? 1 : 0

  name             = "omnipost-scheduler-cron-secret"
  value_wo         = random_password.scheduler_cron[0].result
  value_wo_version = 1
  key_vault_id     = azurerm_key_vault.this[0].id
  content_type     = "Bearer secret for the recurring scheduler processor"
  tags             = merge(local.tags, { managedBy = "terraform", component = "scheduler" })

  depends_on = [
    azurerm_role_assignment.deployment_key_vault_secrets_officer,
    azurerm_role_assignment.operator_key_vault_secrets_officer,
    azurerm_role_assignment.web_identity_key_vault_secrets_officer,
  ]
}

resource "azurerm_container_app_job" "scheduler" {
  count = var.enable_scheduler_processor && var.enable_key_vault ? 1 : 0

  name                         = "${local.base}-scheduler"
  location                     = azurerm_resource_group.this.location
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.sluice[0].id
  replica_timeout_in_seconds   = 60
  replica_retry_limit          = 0
  tags                         = merge(local.tags, { managedBy = "terraform", component = "scheduler" })

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.web_key_vault.id]
  }

  secret {
    name                = "cron-secret"
    identity            = azurerm_user_assigned_identity.web_key_vault.id
    key_vault_secret_id = azurerm_key_vault_secret.scheduler_cron[0].versionless_id
  }

  schedule_trigger_config {
    cron_expression          = "*/2 * * * *"
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name   = "processor"
      image  = "curlimages/curl:8.16.0@sha256:463eaf6072688fe96ac64fa623fe73e1dbe25d8ad6c34404a669ad3ce1f104b6"
      cpu    = 0.25
      memory = "0.5Gi"

      command = ["/bin/sh", "-c"]
      args = [
        "curl --fail --silent --show-error --max-time 50 --output /dev/null --request POST --header \"X-OmniPost-Cron-Secret: $CRON_SECRET\" --header \"User-Agent: omnipost-azure-scheduler/1.0\" \"$PROCESSOR_URL\""
      ]

      env {
        name  = "PROCESSOR_URL"
        value = "https://${var.custom_hostname}/api/scheduler/process"
      }

      env {
        name        = "CRON_SECRET"
        secret_name = "cron-secret"
      }
    }
  }

  depends_on = [azurerm_role_assignment.web_identity_key_vault_secrets_officer]
}

resource "azurerm_container_app" "sluice" {
  count = var.enable_sluice_gateway ? 1 : 0

  name                         = "${local.base}-sluice"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.sluice[0].id
  revision_mode                = "Single"
  tags                         = merge(local.tags, { managedBy = "terraform", component = "sluice-gateway" })

  secret {
    name  = "azure-openai-endpoint"
    value = var.sluice_azure_openai_endpoint
  }

  secret {
    name  = "azure-openai-api-key"
    value = var.sluice_azure_openai_api_key
  }

  secret {
    name  = "sluice-api-key"
    value = var.sluice_api_key
  }

  dynamic "secret" {
    for_each = var.enable_postgresql ? [1] : []
    content {
      name  = "litellm-db-url"
      value = local.postgresql_url
    }
  }

  ingress {
    external_enabled = true
    target_port      = 4000
    transport        = "http"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 3

    http_scale_rule {
      name                = "http-requests"
      concurrent_requests = "50"
    }

    container {
      name   = "litellm"
      image  = var.sluice_image
      cpu    = var.enable_postgresql ? 1.0 : 0.5
      memory = var.enable_postgresql ? "2Gi" : "1Gi"

      command = [
        "/bin/sh",
        "-c",
        "printf '%s' \"$LITELLM_CONFIG_CONTENT\" > /tmp/proxy_config.yaml && exec litellm --config /tmp/proxy_config.yaml --port 4000"
      ]

      env {
        name  = "LITELLM_CONFIG_CONTENT"
        value = local.sluice_litellm_config
      }

      env {
        name        = "LITELLM_AZURE_OPENAI_API_KEY"
        secret_name = "azure-openai-api-key"
      }

      env {
        name        = "LITELLM_GATEWAY_KEY"
        secret_name = "sluice-api-key"
      }

      env {
        name  = "PORT"
        value = "4000"
      }

      dynamic "env" {
        for_each = var.enable_postgresql ? [1] : []
        content {
          name        = "DATABASE_URL"
          secret_name = "litellm-db-url"
        }
      }

      liveness_probe {
        transport        = "HTTP"
        path             = "/health/liveliness"
        port             = 4000
        initial_delay    = 5
        interval_seconds = 10
      }

      readiness_probe {
        transport        = "HTTP"
        path             = "/health/readiness"
        port             = 4000
        initial_delay    = 3
        interval_seconds = 5
      }
    }
  }
}

resource "random_password" "postgresql" {
  count = var.enable_postgresql ? 1 : 0

  length           = 32
  special          = true
  override_special = "_%@"
}

resource "azurerm_postgresql_flexible_server" "this" {
  count = var.enable_postgresql ? 1 : 0

  name                          = "${local.base}-psql-swc"
  resource_group_name           = azurerm_resource_group.this.name
  location                      = var.postgresql_location
  version                       = var.postgresql_version
  administrator_login           = var.postgresql_administrator_login
  administrator_password        = local.postgresql_password
  sku_name                      = "B_Standard_B1ms"
  storage_mb                    = var.postgresql_storage_mb
  backup_retention_days         = var.postgresql_backup_retention_days
  public_network_access_enabled = true
  tags                          = merge(local.tags, { managedBy = "terraform", component = "postgresql" })

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  count = var.enable_postgresql ? 1 : 0

  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.this[0].id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  count = var.enable_postgresql ? 1 : 0

  name      = var.postgresql_database_name
  server_id = azurerm_postgresql_flexible_server.this[0].id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurecaf_name" "app_postgresql" {
  name          = "app"
  resource_type = "azurerm_postgresql_flexible_server"
  prefixes      = [local.org, local.environment, local.project]
  clean_input   = true
}

resource "random_password" "app_postgresql" {
  count = var.enable_app_postgresql ? 1 : 0

  length           = 32
  special          = true
  override_special = "_%@"
}

resource "random_id" "platform_token_encryption_key" {
  count = var.enable_key_vault ? 1 : 0

  byte_length = 32
}

resource "azurerm_postgresql_flexible_server" "app" {
  count = var.enable_app_postgresql ? 1 : 0

  name                          = azurecaf_name.app_postgresql.result
  resource_group_name           = azurerm_resource_group.this.name
  location                      = var.app_postgresql_location
  version                       = "16"
  administrator_login           = var.app_postgresql_administrator_login
  administrator_password        = local.app_postgresql_password
  sku_name                      = "B_Standard_B1ms"
  storage_mb                    = var.app_postgresql_storage_mb
  backup_retention_days         = var.app_postgresql_backup_retention_days
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true
  auto_grow_enabled             = true
  tags                          = merge(local.tags, { managedBy = "terraform", component = "app-postgresql", region = "neu" })

  authentication {
    active_directory_auth_enabled = false
    password_auth_enabled         = true
  }

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "app_allow_azure_services" {
  count = var.enable_app_postgresql ? 1 : 0

  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.app[0].id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_database" "app_database" {
  count = var.enable_app_postgresql ? 1 : 0

  name      = var.app_postgresql_database_name
  server_id = azurerm_postgresql_flexible_server.app[0].id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_key_vault_secret" "app_database_url" {
  count = var.enable_app_postgresql && var.enable_key_vault ? 1 : 0

  name             = "omnipost-database-url"
  value_wo         = local.app_postgresql_url
  value_wo_version = 1
  key_vault_id     = azurerm_key_vault.this[0].id
  content_type     = "PostgreSQL connection URL"
  tags             = merge(local.tags, { managedBy = "terraform", component = "app-postgresql" })

  depends_on = [
    azurerm_postgresql_flexible_server_database.app_database,
    azurerm_role_assignment.deployment_key_vault_secrets_officer,
    azurerm_role_assignment.operator_key_vault_secrets_officer,
    azurerm_role_assignment.web_identity_key_vault_secrets_officer,
  ]
}

resource "azurerm_key_vault_secret" "platform_token_encryption_key" {
  count = var.enable_key_vault ? 1 : 0

  name             = "omnipost-platform-token-encryption-key"
  value_wo         = random_id.platform_token_encryption_key[0].b64_std
  value_wo_version = 1
  key_vault_id     = azurerm_key_vault.this[0].id
  content_type     = "AES-256-GCM key for provider token encryption"
  tags             = merge(local.tags, { managedBy = "terraform", component = "platform-oauth" })

  depends_on = [
    azurerm_role_assignment.deployment_key_vault_secrets_officer,
    azurerm_role_assignment.operator_key_vault_secrets_officer,
    azurerm_role_assignment.web_identity_key_vault_secrets_officer,
  ]
}
