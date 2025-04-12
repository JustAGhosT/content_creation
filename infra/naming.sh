#!/bin/bash

# Input parameters
environment=$1    # dev, test, prod
location=$2       # euw (West Europe), eus (East US), etc.
projectName=$3    # content-creation, etc.

# Function to generate resource names
generate_names() {
  local env=$1
  local loc=$2
  local proj=$3
  
  # Resource Group
  echo "RESOURCE_GROUP=${env}-${loc}-rg-${proj}"
  
  # App Service
  echo "APP_NAME=${env}-${loc}-app-${proj}"
  
  # App Service Plan
  echo "ASP_NAME=${env}-${loc}-asp-${proj}"
}

# Generate and export names
generate_names "$environment" "$location" "$projectName"
