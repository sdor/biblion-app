<#
.SYNOPSIS
    Biblion Office Add-in Local Sideload Script for Windows PowerShell.
.DESCRIPTION
    Registers the manifest.xml in the Windows Office Developer Registry
    (HKCU:\Software\Microsoft\Office\16.0\WEF\Developer) so Microsoft Word
    and Office Desktop can load the local dev add-in.
.PARAMETER Action
    install (default) - Registers the add-in manifest in the developer registry.
    remove            - De-registers the add-in manifest.
    clean-cache       - Clears the Office WebView2 runtime cache on Windows.
.EXAMPLE
    .\scripts\sideload.ps1 install
    .\scripts\sideload.ps1 remove
    .\scripts\sideload.ps1 clean-cache
#>

param(
    [ValidateSet("install", "sideload", "remove", "clean", "unsideload", "clean-cache")]
    [string]$Action = "install"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = Split-Path -Parent $ScriptDir
$ManifestPath = Join-Path $AppDir "manifest.xml"
$ManifestId = "da41848a-44f6-4c62-b0fb-bcea03b416c4"

if (-not (Test-Path $ManifestPath)) {
    Write-Error "Error: manifest.xml was not found at $ManifestPath"
    exit 1
}

$RegKeyPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"
$WefCachePath = Join-Path $env:LOCALAPPDATA "Microsoft\Office\16.0\Wef"

function Install-Manifest {
    Write-Host "=== Sideloading Biblion Add-in on Windows ===" -ForegroundColor Cyan
    Write-Host "Manifest Path: $ManifestPath"

    if (-not (Test-Path $RegKeyPath)) {
        New-Item -Path $RegKeyPath -Force | Out-Null
    }

    Set-ItemProperty -Path $RegKeyPath -Name $ManifestId -Value $ManifestPath -Type String
    Write-Host "`n[✓] Registered Biblion manifest in Windows Office Developer Registry:" -ForegroundColor Green
    Write-Host "    Key:   $RegKeyPath"
    Write-Host "    Name:  $ManifestId"
    Write-Host "    Value: $ManifestPath"

    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Start the HTTPS dev server in a terminal: npm run start:ssl"
    Write-Host "2. Launch Microsoft Word on Windows and open any document."
    Write-Host "3. Check the 'Home' tab ribbon for 'Biblio Development', or go to 'Insert' > 'My Add-ins' > 'Developer Add-ins'."
}

function Remove-Manifest {
    Write-Host "=== Removing Biblion Add-in from Windows ===" -ForegroundColor Cyan

    if (Test-Path $RegKeyPath) {
        $prop = Get-ItemProperty -Path $RegKeyPath -Name $ManifestId -ErrorAction SilentlyContinue
        if ($null -ne $prop) {
            Remove-ItemProperty -Path $RegKeyPath -Name $ManifestId -Force
            Write-Host "[✓] Removed manifest entry from $RegKeyPath" -ForegroundColor Green
        } else {
            Write-Host "[-] Manifest entry not found in $RegKeyPath" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[-] Developer registry key not found." -ForegroundColor Yellow
    }
}

function Clear-WefCache {
    Write-Host "=== Clearing Office WebView2 Cache on Windows ===" -ForegroundColor Cyan
    if (Test-Path $WefCachePath) {
        try {
            Get-Process winword -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
            Remove-Item -Path "$WefCachePath\*" -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "[✓] Cleared Office WEF cache: $WefCachePath" -ForegroundColor Green
        } catch {
            Write-Warning "Could not fully clear WEF cache (is Word currently running?): $_"
        }
    } else {
        Write-Host "[-] WEF cache directory does not exist yet: $WefCachePath"
    }
}

switch ($Action) {
    { $_ -in "install", "sideload" } {
        Install-Manifest
    }
    { $_ -in "remove", "clean", "unsideload" } {
        Remove-Manifest
    }
    "clean-cache" {
        Clear-WefCache
    }
}
