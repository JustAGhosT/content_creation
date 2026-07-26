output "web_app_name" {
  value = azurerm_linux_web_app.web.name
}

output "web_app_default_hostname" {
  value = azurerm_linux_web_app.web.default_hostname
}

output "custom_hostname" {
  value = var.custom_hostname
}

output "application_insights_connection_string" {
  value     = azurerm_application_insights.this.connection_string
  sensitive = true
}

output "key_vault_name" {
  value = var.enable_key_vault ? azurerm_key_vault.this[0].name : null
}

output "sluice_gateway_name" {
  value = var.enable_sluice_gateway ? azurerm_container_app.sluice[0].name : null
}

output "sluice_gateway_url" {
  value = var.enable_sluice_gateway ? "https://${azurerm_container_app.sluice[0].ingress[0].fqdn}" : null
}

output "scheduler_job_name" {
  value = var.enable_scheduler_processor && var.enable_key_vault ? azurerm_container_app_job.scheduler[0].name : null
}

output "postgresql_server_name" {
  value = var.enable_postgresql ? azurerm_postgresql_flexible_server.this[0].name : null
}

output "postgresql_database_name" {
  value = var.enable_postgresql ? azurerm_postgresql_flexible_server_database.app[0].name : null
}

output "app_postgresql_server_name" {
  value = var.enable_app_postgresql ? azurerm_postgresql_flexible_server.app[0].name : null
}

output "app_postgresql_database_name" {
  value = var.enable_app_postgresql ? azurerm_postgresql_flexible_server_database.app_database[0].name : null
}

output "web_key_vault_identity_client_id" {
  value = azurerm_user_assigned_identity.web_key_vault.client_id
}
