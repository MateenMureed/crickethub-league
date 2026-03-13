param(
  [Parameter(Mandatory = $true)][string]$RepoName,
  [string]$Visibility = 'public'
)

$ErrorActionPreference = 'Stop'

Write-Host "Checking GitHub auth..."
try {
  gh auth status | Out-Null
} catch {
  Write-Host "GitHub CLI is not authenticated. Running gh auth login..."
  gh auth login
}

if (-not (Test-Path .git)) {
  Write-Host "Initializing git repository..."
  git init
}

Write-Host "Creating initial commit..."
git add .
try {
  git commit -m "Initial commit: CricketHub project" | Out-Null
} catch {
  Write-Host "No new commit created (working tree may already be committed)."
}

Write-Host "Creating GitHub repository and pushing..."
if ($Visibility -ne 'private') {
  $Visibility = 'public'
}

gh repo create $RepoName --source . --remote origin --$Visibility --push
Write-Host "GitHub repository setup complete."
