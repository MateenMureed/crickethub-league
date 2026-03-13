param(
  [Parameter(Mandatory = $true)][string]$ResourceGroup,
  [Parameter(Mandatory = $true)][string]$WebAppName,
  [Parameter(Mandatory = $true)][string]$CosmosAccountName,
  [string]$Location = 'uaenorth'
)

$ErrorActionPreference = 'Stop'

Write-Host "Checking Azure login..."
try {
  az account show | Out-Null
} catch {
  Write-Host "Azure CLI is not logged in. Running az login..."
  az login | Out-Null
}

Write-Host "Creating resource group in $Location..."
az group create --name $ResourceGroup --location $Location | Out-Null

$planName = "$WebAppName-plan"

Write-Host "Creating App Service plan and Web App..."
az appservice plan create --name $planName --resource-group $ResourceGroup --location $Location --is-linux --sku B1 | Out-Null
az webapp create --name $WebAppName --resource-group $ResourceGroup --plan $planName --runtime "NODE|22-lts" | Out-Null

Write-Host "Creating Cosmos DB account/database/container..."
az cosmosdb create --name $CosmosAccountName --resource-group $ResourceGroup --locations regionName=$Location failoverPriority=0 isZoneRedundant=false --default-consistency-level Session | Out-Null
az cosmosdb sql database create --account-name $CosmosAccountName --resource-group $ResourceGroup --name league-db | Out-Null
az cosmosdb sql container create --account-name $CosmosAccountName --resource-group $ResourceGroup --database-name league-db --name app-state --partition-key-path "/pk" | Out-Null

$cosmosEndpoint = az cosmosdb show --name $CosmosAccountName --resource-group $ResourceGroup --query "documentEndpoint" -o tsv
$cosmosKey = az cosmosdb keys list --name $CosmosAccountName --resource-group $ResourceGroup --query "primaryMasterKey" -o tsv

Write-Host "Configuring Web App settings..."
$allowedOrigins = "https://$WebAppName.azurewebsites.net"
az webapp config appsettings set --name $WebAppName --resource-group $ResourceGroup --settings `
  WEBSITES_PORT=3001 `
  SCM_DO_BUILD_DURING_DEPLOYMENT=true `
  ALLOWED_ORIGINS=$allowedOrigins `
  COSMOS_ENDPOINT=$cosmosEndpoint `
  COSMOS_KEY=$cosmosKey `
  COSMOS_DB_NAME=league-db `
  COSMOS_CONTAINER_NAME=app-state `
  COSMOS_PARTITION_KEY=default `
  COSMOS_DOC_ID=state | Out-Null

Write-Host "Installing dependencies and building web app..."
npm install
npm run build

Write-Host "Deploying app to Azure Web App..."
az webapp up --name $WebAppName --resource-group $ResourceGroup --runtime "NODE:22-lts" --location $Location --sku B1 | Out-Null

Write-Host "Deployment complete."
Write-Host "Website/API URL: https://$WebAppName.azurewebsites.net"
