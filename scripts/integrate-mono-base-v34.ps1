# Import exact, reviewed MONO BASE v3.4 release candidate into Draft PR #33.
# Examples:
#   .\scripts\integrate-mono-base-v34.ps1 -RepoPath . -ZipPath C:\Downloads\MONO_BASE_v34_staging_candidate_r2.zip
#   .\scripts\integrate-mono-base-v34.ps1 -RepoPath . -ZipPath C:\Downloads\MONO_BASE_v34_staging_candidate_r2.zip -Apply -Push
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$RepoPath,
    [Parameter(Mandatory=$true)][string]$ZipPath,
    [switch]$Apply,
    [switch]$Push
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$branch = 'feature/mono-base-kaito-integration'
$zipSha256 = '8d490170608c1ef955351aa8ec06e2f5d21fb802c1be7a154ffeb360ce8d28e9'

if ($Push -and -not $Apply) { throw 'Use -Apply together with -Push.' }
$root = (Resolve-Path -LiteralPath $RepoPath).Path
$zip = (Resolve-Path -LiteralPath $ZipPath).Path

function Invoke-Checked {
    param([string]$Tool, [string[]]$Arguments)
    & $Tool @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Tool exited with $LASTEXITCODE (arguments: $($Arguments -join ' '))" }
}
Push-Location -LiteralPath $root
try {
    if ((git branch --show-current).Trim() -ne $branch) {
        throw "This script may only run on the Draft PR branch: $branch"
    }
    if ($LASTEXITCODE -ne 0) { throw 'Unable to determine current branch.' }
    $origin = (git remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $origin -notmatch '(?:^|[/:])k-ait0/k-aito-com(?:\.git)?$') {
        throw "Unexpected Git remote: $origin"
    }
    $dirty = @(git status --porcelain --untracked-files=normal)
    if ($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0) {
        throw 'Working tree is not clean. Preserve existing changes before importing.'
    }
    Invoke-Checked -Tool 'git' -Arguments @('fetch','--no-tags','origin',$branch)
    $remote = (git rev-parse "refs/remotes/origin/$branch").Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Unable to resolve upstream branch.' }
    $localHead = (git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $localHead -ne $remote) {
        throw "Local branch is not at upstream head ($localHead vs $remote). Update/synchronize it before continuing."
    }
    $digest = (Get-FileHash -Algorithm SHA256 -LiteralPath $zip).Hash.ToLowerInvariant()
    if ($digest -ne $zipSha256) { throw "Release ZIP checksum mismatch: $digest" }
    Write-Host "Approved ZIP and unchanged upstream branch verified: $($localHead.Substring(0,12))"

    Invoke-Checked -Tool 'python' -Arguments @('scripts/import-mono-base.py',$zip,'--destination','mono-base','--overwrite-pages')
    if (-not $Apply) {
        Write-Host 'DRY RUN passed; no files, commits or deployment changed.'
        return
    }

    Invoke-Checked -Tool 'python' -Arguments @('scripts/import-mono-base.py',$zip,'--destination','mono-base','--overwrite-pages','--apply')
    Invoke-Checked -Tool 'python' -Arguments @('scripts/verify-mono-base-original-assets.py','mono-base')
    Invoke-Checked -Tool 'node' -Arguments @('scripts/site-static-check.cjs')
    Invoke-Checked -Tool 'node' -Arguments @('scripts/test-mono-base-preview.cjs')
    Invoke-Checked -Tool 'node' -Arguments @('scripts/test-site-shell.cjs')
    Invoke-Checked -Tool 'git' -Arguments @('diff','--check')
    Invoke-Checked -Tool 'git' -Arguments @('add','--','mono-base')
    Invoke-Checked -Tool 'git' -Arguments @('diff','--cached','--check')
    $staged = @(git diff --cached --name-only)
    if ($LASTEXITCODE -ne 0 -or $staged.Count -lt 1) {
        throw 'No changes staged: refusing an empty integration commit.'
    }
    Invoke-Checked -Tool 'git' -Arguments @('commit','-m','feat(mono-base): integrate reviewed v3.4 site and original assets')
    if ($Push) {
        Invoke-Checked -Tool 'git' -Arguments @('push','origin',"HEAD:refs/heads/$branch")
        Write-Host 'Pushed to existing Draft PR #33. Check full-v3.4 CI; DO NOT MERGE until reviewed.'
    } else {
        Write-Host 'Integrated into local Draft PR branch only. Push the newly created commit manually with git push origin HEAD:refs/heads/$branch after reviewing it.'
    }
    Write-Host 'No GitHub PR merge or production deployment was performed.'
} finally {
    Pop-Location
}
