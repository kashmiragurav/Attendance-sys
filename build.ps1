Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  SmartAttend - React Native Build System" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Select build target:" -ForegroundColor Yellow
Write-Host "  [1] Build Android Release APK  (Recommended for sharing APK)"
Write-Host "  [2] Build Android Debug APK    (For rapid testing on device)"
Write-Host "  [3] Build Android App Bundle   (AAB for Play Store upload)"
Write-Host "  [4] Build Web Bundle           (Static web files)"
Write-Host "  [5] Clean Build Cache          (Fix compilation errors)"
Write-Host ""

$choice = Read-Host "Enter choice (1-5)"

switch ($choice) {
    "1" { node scripts/build.js apk }
    "2" { node scripts/build.js debug }
    "3" { node scripts/build.js bundle }
    "4" { node scripts/build.js web }
    "5" { node scripts/build.js clean }
    Default { Write-Host "Invalid selection." -ForegroundColor Red }
}
