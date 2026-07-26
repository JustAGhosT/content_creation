variable "subscription_id" {
  type        = string
  description = "Azure subscription containing the Omnipost dev runtime."
  default     = "bb4e3882-2079-4bab-8974-611bc0b8bb58"
}

variable "location" {
  type        = string
  description = "Azure region for Omnipost dev resources."
  default     = "westeurope"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group containing Omnipost dev resources."
  default     = "nl-dev-omnipost-rg"
}

variable "custom_hostname" {
  type        = string
  description = "Public Omnipost hostname. DNS is owned by neuralliquid-org."
  default     = "omnipost.neuralliquid.ai"
}

variable "enable_key_vault" {
  type        = bool
  description = "Whether to manage the Omnipost Key Vault."
  default     = true
}

variable "enable_sluice_gateway" {
  type        = bool
  description = "Whether to manage the internal Sluice gateway Container App."
  default     = true
}

variable "enable_scheduler_processor" {
  type        = bool
  description = "Whether to run the durable scheduler processor every two minutes as a Container Apps Job."
  default     = true
}

variable "sluice_image" {
  type        = string
  description = "Container image for the Sluice gateway."
  default     = "litellm/litellm-database:v1.83.7-stable@sha256:85e3d3ca43ff554b5731b00ef470ce7717f47505e56676afd46ec3a9f5a63466"
}

variable "sluice_azure_openai_endpoint" {
  type        = string
  description = "Azure OpenAI endpoint used by the Sluice gateway."
  sensitive   = true
}

variable "sluice_azure_openai_api_key" {
  type        = string
  description = "Azure OpenAI API key used by the Sluice gateway."
  sensitive   = true
}

variable "sluice_api_key" {
  type        = string
  description = "API key required by clients calling the Sluice gateway."
  sensitive   = true
}

variable "sluice_default_model" {
  type        = string
  description = "Default Azure OpenAI deployment/model exposed through Sluice."
  default     = "gpt-4o"
}

variable "sluice_embedding_model" {
  type        = string
  description = "Azure OpenAI embedding deployment/model exposed through Sluice."
  default     = "text-embedding-3-large"
}

variable "sluice_azure_openai_api_version" {
  type        = string
  description = "Azure OpenAI API version for default Sluice model calls."
  default     = "2025-04-01-preview"
}

variable "sluice_azure_openai_embedding_api_version" {
  type        = string
  description = "Azure OpenAI API version for Sluice embedding calls."
  default     = "2024-02-01"
}

variable "enable_postgresql" {
  type        = bool
  description = "Whether to manage PostgreSQL for Sluice LiteLLM persistence."
  default     = true
}

variable "postgresql_administrator_login" {
  type        = string
  description = "PostgreSQL administrator login, required only when enable_postgresql is true."
  default     = "omnipostadmin"
}

variable "postgresql_administrator_password" {
  type        = string
  description = "PostgreSQL administrator password, required only when enable_postgresql is true."
  sensitive   = true
  default     = null
}

variable "postgresql_version" {
  type        = string
  description = "PostgreSQL major version."
  default     = "16"
}

variable "postgresql_location" {
  type        = string
  description = "Azure region for PostgreSQL Flexible Server. Separate from the Web App region because some subscriptions are restricted by offer in westeurope."
  default     = "swedencentral"
}

variable "postgresql_database_name" {
  type        = string
  description = "Omnipost PostgreSQL application database name."
  default     = "omnipost"
}

variable "postgresql_storage_mb" {
  type        = number
  description = "PostgreSQL storage size in MB."
  default     = 32768
}

variable "postgresql_backup_retention_days" {
  type        = number
  description = "PostgreSQL backup retention in days."
  default     = 7
}

variable "enable_app_postgresql" {
  type        = bool
  description = "Whether to manage the dedicated OmniPost application PostgreSQL server."
  default     = true
}

variable "app_postgresql_location" {
  type        = string
  description = "Lowest-cost credible European region for the dedicated OmniPost database."
  default     = "northeurope"
}

variable "app_postgresql_administrator_login" {
  type        = string
  description = "Administrator login for the dedicated OmniPost PostgreSQL server."
  default     = "omnipostappadmin"
}

variable "app_postgresql_administrator_password" {
  type        = string
  description = "Optional externally supplied password for the dedicated OmniPost PostgreSQL server."
  sensitive   = true
  default     = null
}

variable "app_postgresql_database_name" {
  type        = string
  description = "Database used only by the OmniPost web application."
  default     = "omnipost_app"
}

variable "app_postgresql_storage_mb" {
  type        = number
  description = "Storage allocated to the dedicated OmniPost PostgreSQL server."
  default     = 32768
}

variable "app_postgresql_backup_retention_days" {
  type        = number
  description = "Backup retention for the dedicated OmniPost PostgreSQL server."
  default     = 7
}

variable "deployment_principal_object_id" {
  type        = string
  description = "Object ID of the GitHub Actions OIDC service principal."
  default     = "369def47-8d91-4710-8c37-e521bc4a360a"
}

variable "operator_principal_object_id" {
  type        = string
  description = "Object ID of the current deployment operator."
  default     = "99b63adb-8f1a-4d7a-a98c-5bfe9c7fcd96"
}
