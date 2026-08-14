param(
    [Parameter(Mandatory = $true)]
    [string]$SourceRoot,

    [Parameter(Mandatory = $true)]
    [string]$TargetRoot,

    [switch]$DryRun,

    [switch]$Apply
)

$ErrorActionPreference = 'Stop'

if ($DryRun -and $Apply) {
    throw 'Use either -DryRun or -Apply, not both.'
}

$mode = if ($Apply) { 'APPLY' } else { 'DRY_RUN' }
$sourcePath = [System.IO.Path]::GetFullPath($SourceRoot)
$targetPath = [System.IO.Path]::GetFullPath($TargetRoot)

if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
    throw "SourceRoot does not exist: $sourcePath"
}

$allowedFiles = @('SKILL.md', 'LICENSE', 'LICENSE.txt', 'README.md')
$allowedDirectories = @('agents', 'assets', 'references', 'scripts')
$skills = @(Get-ChildItem -LiteralPath $sourcePath -Directory | Sort-Object Name)
if ($skills.Count -eq 0) {
    throw "No skills found in SourceRoot: $sourcePath"
}

function Get-RelativePath {
    param([string]$BasePath, [string]$FullPath)
    $baseUri = [Uri]((Resolve-Path -LiteralPath $BasePath).Path.TrimEnd('\') + '\')
    $fullUri = [Uri](Resolve-Path -LiteralPath $FullPath).Path
    return [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fullUri).ToString()).Replace('/', '\')
}

function Get-SkillHash {
    param([string]$SkillPath)
    $lines = @()
    Get-ChildItem -LiteralPath $SkillPath -File -Recurse |
        Where-Object { $_.Name -ne '.wechat-skill-install.json' } |
        Sort-Object FullName |
        ForEach-Object {
            $relative = Get-RelativePath -BasePath $SkillPath -FullPath $_.FullName
            $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            $lines += "$relative`t$hash"
        }
    $payload = [System.Text.Encoding]::UTF8.GetBytes(($lines -join "`n"))
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha.ComputeHash($payload))).Replace('-', '').ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
}

function Assert-SkillStructure {
    param([System.IO.DirectoryInfo]$Skill)
    if ($Skill.Name -notmatch '^wechat-[a-z0-9-]+$') {
        throw "Undeclared skill directory: $($Skill.Name)"
    }
    $skillMd = Join-Path $Skill.FullName 'SKILL.md'
    $metadata = Join-Path $Skill.FullName 'agents\openai.yaml'
    if (-not (Test-Path -LiteralPath $skillMd -PathType Leaf)) {
        throw "Missing SKILL.md: $($Skill.Name)"
    }
    if (-not (Test-Path -LiteralPath $metadata -PathType Leaf)) {
        throw "Missing agents/openai.yaml: $($Skill.Name)"
    }
    $skillText = Get-Content -LiteralPath $skillMd -Raw -Encoding UTF8
    if ($skillText -notmatch "(?m)^name:\s*$([regex]::Escape($Skill.Name))\s*$") {
        throw "Frontmatter name does not match directory: $($Skill.Name)"
    }
    $metadataText = Get-Content -LiteralPath $metadata -Raw -Encoding UTF8
    if ($metadataText -notmatch [regex]::Escape('$' + $Skill.Name)) {
        throw "Default prompt does not reference `$$($Skill.Name): $($Skill.Name)"
    }
    Get-ChildItem -LiteralPath $Skill.FullName -Force | ForEach-Object {
        if ($_.PSIsContainer) {
            if ($allowedDirectories -notcontains $_.Name) {
                throw "Undeclared top-level directory in $($Skill.Name): $($_.Name)"
            }
        } elseif ($allowedFiles -notcontains $_.Name) {
            throw "Undeclared top-level file in $($Skill.Name): $($_.Name)"
        }
    }
}

$plan = @()
foreach ($skill in $skills) {
    Assert-SkillStructure -Skill $skill
    $hash = Get-SkillHash -SkillPath $skill.FullName
    $destination = Join-Path $targetPath $skill.Name
    $action = 'ADD'
    if (Test-Path -LiteralPath $destination) {
        $markerPath = Join-Path $destination '.wechat-skill-install.json'
        if (-not (Test-Path -LiteralPath $markerPath -PathType Leaf)) {
            throw "Refusing to overwrite unknown target directory: $destination"
        }
        $marker = Get-Content -LiteralPath $markerPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($marker.skillName -ne $skill.Name) {
            throw "Target ownership marker mismatch: $destination"
        }
        if ($marker.sourceHash -eq $hash) { $action = 'UNCHANGED' } else { $action = 'UPDATE' }
    }
    $plan += [pscustomobject]@{
        skillName = $skill.Name
        action = $action
        source = $skill.FullName
        destination = $destination
        sourceHash = $hash
    }
}

$result = [ordered]@{
    status = 'PASS'
    mode = $mode
    sourceRoot = $sourcePath
    targetRoot = $targetPath
    skillCount = $plan.Count
    changes = @($plan | Where-Object { $_.action -ne 'UNCHANGED' }).Count
    skills = $plan
}

if (-not $Apply) {
    $result | ConvertTo-Json -Depth 6
    exit 0
}

New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backupRoot = Join-Path $targetPath "_wechat-skills-backups\$timestamp"
$stagingRoot = Join-Path $targetPath "_wechat-skills-staging-$timestamp"
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

try {
    foreach ($item in $plan) {
        if ($item.action -eq 'UNCHANGED') { continue }
        $staged = Join-Path $stagingRoot $item.skillName
        Copy-Item -LiteralPath $item.source -Destination $staged -Recurse
        $marker = [ordered]@{
            skillName = $item.skillName
            sourceRoot = $sourcePath
            sourceHash = $item.sourceHash
            installedAt = (Get-Date).ToString('o')
        }
        $marker | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $staged '.wechat-skill-install.json') -Encoding UTF8

        if (Test-Path -LiteralPath $item.destination) {
            New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
            Move-Item -LiteralPath $item.destination -Destination (Join-Path $backupRoot $item.skillName)
        }
        Move-Item -LiteralPath $staged -Destination $item.destination
    }
} catch {
    $result.status = 'FAIL'
    $result.error = $_.Exception.Message
    throw
} finally {
    if (Test-Path -LiteralPath $stagingRoot) {
        Remove-Item -LiteralPath $stagingRoot -Recurse -Force
    }
}

$result.backupRoot = if (Test-Path -LiteralPath $backupRoot) { $backupRoot } else { $null }
$manifestPath = Join-Path $targetPath '_wechat-skills-install-manifest.json'
$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
$result.manifestPath = $manifestPath
$result | ConvertTo-Json -Depth 6
