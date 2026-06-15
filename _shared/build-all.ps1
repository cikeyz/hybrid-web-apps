# --------------------------------------------------------
# build-all.ps1 — builds all 3 Activity-07 APKs.
#
# Why C:\cordova-builds and not the OneDrive folder?
# npm install silently misbehaves under the OneDrive-synced path
# (reports "up to date" while node_modules stays empty), so we scaffold
# and build each Cordova project in a plain local folder, then copy the
# finished APK back into the Activity-07/apk deliverables folder.
# --------------------------------------------------------

. 'D:\OneDrive\Documents\University\3rd-Year\2nd-Sem-Agent\WMS\Activities\Activity-07\_shared\cordova-env.ps1'

$ErrorActionPreference = 'Stop'
$A7 = 'D:\OneDrive\Documents\University\3rd-Year\2nd-Sem-Agent\WMS\Activities\Activity-07'
$BUILD_ROOT = 'C:\cordova-builds'
$APK_OUT = Join-Path $A7 'apk'

New-Item -ItemType Directory -Force -Path $BUILD_ROOT | Out-Null
New-Item -ItemType Directory -Force -Path $APK_OUT | Out-Null

# Each project: source www/ folder, app id, app name, output apk filename.
$projects = @(
    @{ src='PUP-Hymn';              appId='com.ckortiz.puphymn';          appName='PUP Hymn';              apk='PUP-Hymn.apk' },
    @{ src='CK-DevVerse';           appId='com.ckortiz.ckdevverse';       appName='CK DevVerse';           apk='CK-DevVerse.apk' },
    @{ src='Student-Registration';  appId='com.ckortiz.studentreg';       appName='Student Registration';  apk='Student-Registration.apk' }
)

# Per-project plugins:
#  - statusbar (all 3): colored status bar matching each app's header.
#  - inappbrowser (CK-DevVerse): external target=_blank links open in system browser.
#  - media (PUP-Hymn): native audio playback with reliable seeking; the HTML5
#    <audio> element can't seek under cordova-android's WebViewAssetLoader
#    because it does not support byte-range requests.
#  - codeplay-music-controls (PUP-Hymn): Android 12+ compatible media session
#    notification with progress/seek support (replaces music-controls2, which
#    is incompatible with Android 13+ media-session requirements).
$commonPlugins = @('cordova-plugin-statusbar')
$projectPlugins = @{
    'PUP-Hymn'             = @('cordova-plugin-media', 'cordova-codeplay-music-controls', 'cordova-plugin-android-permissions')
    'CK-DevVerse'          = @('cordova-plugin-inappbrowser')
    'Student-Registration' = @()
}

foreach ($p in $projects) {
    $workDir = Join-Path $BUILD_ROOT $p.src
    Write-Host ""
    Write-Host "============================================"
    Write-Host "BUILD: $($p.appName) ($($p.appId))"
    Write-Host "============================================"

    # 1. Fresh folder each time.
    if (Test-Path $workDir) { Remove-Item $workDir -Recurse -Force }
    New-Item -ItemType Directory -Path $workDir | Out-Null
    Set-Location $workDir

    # 2. Scaffold Cordova project.
    Write-Host "-- cordova create"
    & cordova create . $p.appId $p.appName 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "cordova create failed for $($p.src)" }

    # 3. Overlay our prepared www/, config.xml, and res/ icons (Cordova
    #    created defaults for all three; ours replace them).
    Remove-Item "www" -Recurse -Force
    Copy-Item (Join-Path $A7 (Join-Path $p.src 'www')) "www" -Recurse
    Copy-Item (Join-Path $A7 (Join-Path $p.src 'config.xml')) "config.xml" -Force
    $resSrc = Join-Path $A7 (Join-Path $p.src 'res')
    if (Test-Path $resSrc) { Copy-Item $resSrc "res" -Recurse -Force }
    Write-Host "-- overlaid prepared www/, config.xml, res/"

    # 4. Write .npmrc BEFORE any plugin/platform operations. npm 11 omits
    #    devDependencies by default, and Cordova lists plugins + cordova-android
    #    under devDependencies, so cordova's internal fetch would report
    #    "up to date" while nothing installs. A project .npmrc with omit=
    #    overrides this for the whole build folder.
    Write-Host "-- write .npmrc (omit=) to allow devDependencies"
    Set-Content -Path (Join-Path $workDir '.npmrc') -Value 'omit=' -Encoding utf8

    # 5. Add plugins: common (statusbar) + this project's extras.
    $plugins = $commonPlugins + $projectPlugins[$p.src]
    foreach ($plugin in $plugins) {
        Write-Host "-- cordova plugin add $plugin"
        & cordova plugin add $plugin 2>&1 | Out-Null
    }

    # 6. Add Android platform.
    Write-Host "-- cordova platform add android"
    & cordova platform add android 2>&1 | Select-Object -Last 2
    if ($LASTEXITCODE -ne 0) { throw "platform add failed for $($p.src)" }

    # 6. Build the debug APK.
    Write-Host "-- cordova build android --debug"
    & cordova build android --debug 2>&1 | Select-Object -Last 6
    if ($LASTEXITCODE -ne 0) { throw "build failed for $($p.src)" }

    # 7. Locate the produced APK and copy it to the deliverables folder.
    $apkPath = Join-Path $workDir 'platforms\android\app\build\outputs\apk\debug\app-debug.apk'
    if (-not (Test-Path $apkPath)) { throw "APK not found at expected path for $($p.src): $apkPath" }
    $dest = Join-Path $APK_OUT $p.apk
    Copy-Item $apkPath $dest -Force
    $sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 2)
    Write-Host "-- OK: $dest ($sizeMB MB)"
}

Write-Host ""
Write-Host "============================================"
Write-Host "ALL BUILDS COMPLETE"
Write-Host "============================================"
Get-ChildItem $APK_OUT -Filter '*.apk' | Select-Object Name, @{N='MB';E={[math]::Round($_.Length/1MB,2)}}, LastWriteTime
