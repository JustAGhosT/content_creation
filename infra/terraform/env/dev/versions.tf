terraform {
  required_version = ">= 1.5.0"

  backend "azurerm" {
    subscription_id      = "bb4e3882-2079-4bab-8974-611bc0b8bb58"
    resource_group_name  = "nl-org-tfstate-rg"
    storage_account_name = "nlorgtfstate"
    container_name       = "tfstate"
    key                  = "products/omnipost/dev.tfstate"
    use_azuread_auth     = true
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azurecaf = {
      source  = "aztfmod/azurecaf"
      version = "~> 1.2"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
