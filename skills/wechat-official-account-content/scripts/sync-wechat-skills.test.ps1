$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'sync-wechat-skills.ps1'
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$testRoot = Join-Path (Join-Path $workspaceRoot '.tmp') ('wechat-skill-sync-test-' + [Guid]::NewGuid().ToString('N'))
$source = Join-Path $testRoot 'source'
$target = Join-Path $testRoot 'target'

function New-FixtureSkill {
    param([string]$Name)
    $skillRoot = Join-Path $source $Name
    New-Item -ItemType Directory -Path (Join-Path $skillRoot 'agents') -Force | Out-Null
    @"
---
name: $Name
description: 用于同步脚本测试的临时技能，验证发现元数据、哈希与安全更新行为。
---

# Fixture
"@ | Set-Content -LiteralPath (Join-Path $skillRoot 'SKILL.md') -Encoding UTF8
    @"
interface:
  display_name: "测试技能"
  short_description: "用于同步脚本测试的临时技能，验证安全安装和更新行为"
  default_prompt: "使用 `$$Name 执行测试。"
"@ | Set-Content -LiteralPath (Join-Path $skillRoot 'agents\openai.yaml') -Encoding UTF8
}

New-Item -ItemType Directory -Path $source -Force | Out-Null
New-FixtureSkill -Name 'wechat-fixture-one'
New-FixtureSkill -Name 'wechat-fixture-two'

$dryRun = & powershell -ExecutionPolicy Bypass -File $scriptPath -SourceRoot $source -TargetRoot $target -DryRun | ConvertFrom-Json
if ($dryRun.status -ne 'PASS' -or $dryRun.skillCount -ne 2 -or (Test-Path -LiteralPath (Join-Path $target 'wechat-fixture-one'))) {
    throw 'Dry-run test failed.'
}

$first = & powershell -ExecutionPolicy Bypass -File $scriptPath -SourceRoot $source -TargetRoot $target -Apply | ConvertFrom-Json
if ($first.status -ne 'PASS' -or -not (Test-Path -LiteralPath (Join-Path $target 'wechat-fixture-one\SKILL.md'))) {
    throw 'Initial install test failed.'
}

Add-Content -LiteralPath (Join-Path $source 'wechat-fixture-one\SKILL.md') -Value "`nUpdated fixture." -Encoding UTF8
$update = & powershell -ExecutionPolicy Bypass -File $scriptPath -SourceRoot $source -TargetRoot $target -Apply | ConvertFrom-Json
if ($update.status -ne 'PASS' -or -not $update.backupRoot -or -not (Test-Path -LiteralPath $update.backupRoot)) {
    throw 'Update/backup test failed.'
}

Set-Content -LiteralPath (Join-Path $source 'wechat-fixture-one\unexpected.bin') -Value 'unexpected' -Encoding UTF8
$undeclaredFailed = $false
try {
    & powershell -ExecutionPolicy Bypass -File $scriptPath -SourceRoot $source -TargetRoot $target -DryRun 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { $undeclaredFailed = $true }
} catch {
    $undeclaredFailed = $true
}
if (-not $undeclaredFailed) { throw 'Undeclared file was not rejected.' }

$missingFailed = $false
try {
    & powershell -ExecutionPolicy Bypass -File $scriptPath -SourceRoot (Join-Path $testRoot 'missing') -TargetRoot $target -DryRun 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { $missingFailed = $true }
} catch {
    $missingFailed = $true
}
if (-not $missingFailed) { throw 'Missing source directory was not rejected.' }

[pscustomobject]@{
    status = 'PASS'
    testRoot = $testRoot
    tests = 4
} | ConvertTo-Json
