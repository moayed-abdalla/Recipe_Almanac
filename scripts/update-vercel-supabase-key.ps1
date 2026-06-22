# Updates Vercel env vars after rotating Supabase keys.
# Reads values from .env.local in the project root.
# Usage:
#   1. Fill in .env.local with your new keys.
#   2. Run: npx vercel login
#   3. Run: .\scripts\update-vercel-supabase-key.ps1
param(
  [string]$EnvFile = ".env.local"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $EnvFile)) {
  throw "Missing $EnvFile. Create it from .env.example first."
}

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { return }
  $name = $line.Substring(0, $idx).Trim()
  $value = $line.Substring($idx + 1).Trim()
  $vars[$name] = $value
}

$required = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY"
)

foreach ($name in $required) {
  if (-not $vars.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($vars[$name])) {
    throw "Missing or empty $name in $EnvFile"
  }
  if ($vars[$name] -match "your_|placeholder|<") {
    throw "$name still looks like a placeholder in $EnvFile"
  }
}

Write-Host "Updating Vercel env vars from $EnvFile..."

foreach ($target in @("production", "preview", "development")) {
  Write-Host "-> $target"
  foreach ($name in $required) {
    npx vercel env rm $name $target --yes 2>$null | Out-Null
    $vars[$name] | npx vercel env add $name $target --force 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to set $name for $target"
    }
    Write-Host "   set $name"
  }
}

Write-Host "Done. Redeploy with: npx vercel --prod"
