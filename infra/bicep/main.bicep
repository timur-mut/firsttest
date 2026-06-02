// =============================================================================
// FirstTest — Azure free-tier infrastructure
//   API    -> App Service (F1 Free plan, Linux, .NET 8)
//   Client -> Static Web Apps (Free SKU)
//   DB     -> external free Postgres (Neon / Supabase) via connection string
// =============================================================================

@description('Base name used to derive resource names.')
param appName string = 'firsttest'

@description('Region for the App Service plan / web app.')
param location string = resourceGroup().location

@description('Region for the Static Web App (limited set, e.g. westeurope, eastus2).')
param swaLocation string = 'westeurope'

@secure()
@description('Full PostgreSQL connection string (Neon/Supabase). Include SSL Mode=Require.')
param pgConnectionString string

@description('Allowed CORS origin for the client (the Static Web App URL).')
param clientOrigin string = ''

var webAppName = '${appName}-api'
var swaName = '${appName}-client'

// --- App Service plan (Free F1, Linux) --------------------------------------
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${appName}-plan'
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  kind: 'linux'
  properties: {
    reserved: true // required for Linux
  }
}

// --- Web App (the .NET 8 API) -----------------------------------------------
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|8.0'
      ftpsState: 'Disabled'
      // F1 (Free) does NOT support alwaysOn — must stay false.
      alwaysOn: false
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
        { name: 'ConnectionStrings__Postgres', value: pgConnectionString }
        { name: 'Cors__AllowedOrigins', value: clientOrigin }
        { name: 'RunMigrationsOnStartup', value: 'true' }
      ]
    }
  }
}

// --- Static Web App (the React client, Free SKU) ----------------------------
resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: swaLocation
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output apiUrl string = 'https://${webApp.properties.defaultHostName}'
output apiName string = webApp.name
output clientUrl string = 'https://${swa.properties.defaultHostname}'
output staticWebAppName string = swa.name
