@description('The name of the web app to create')
param appName string

@description('The location to deploy the resources')
param location string = resourceGroup().location

@description('The SKU of the app service plan')
@allowed([
'B1'
'B2'
'B3'
'S1'
'S2'
'S3'
'P1v2'
'P2v2'
'P3v2'
])
param sku string = 'B1'

@description('The runtime stack of the web app')
param linuxFxVersion string = 'NODE|20-lts'

@description('The name of the app service plan')
param appServicePlanName string = '${appName}-asp'

@description('Tags for all resources')
param tags object = {
environment: split(appName, '-')[0]
project: split(appName, '-')[3]
}

resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
name: appServicePlanName
location: location
tags: tags
sku: {
  name: sku
}
kind: 'linux'
properties: {
  reserved: true
}
}

resource webApp 'Microsoft.Web/sites@2022-09-01' = {
name: appName
location: location
tags: tags
properties: {
  serverFarmId: appServicePlan.id
  siteConfig: {
    linuxFxVersion: linuxFxVersion
    alwaysOn: true
    http20Enabled: true
    minTlsVersion: '1.2'
    appSettings: [
      {
        name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
        value: 'true'
      }
      {
        name: 'WEBSITE_NODE_DEFAULT_VERSION'
        value: '~20'
      }
      {
        name: 'ENVIRONMENT'
        value: split(appName, '-')[0]
      }
    ]
  }
}
}

output webAppName string = webApp.name
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
