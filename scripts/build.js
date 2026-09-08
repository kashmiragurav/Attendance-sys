const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';

const target = (process.argv[2] || 'apk').toLowerCase();

console.log('===================================================');
console.log('🚀 Starting SmartAttend App Build Process');
console.log(`🎯 Target: ${target.toUpperCase()}`);
console.log('===================================================\n');

try {
  if (target === 'apk' || target === 'release') {
    console.log('📦 Building Android Release APK...');
    execSync(`${gradlewCmd} assembleRelease`, { cwd: androidDir, stdio: 'inherit' });
    const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    console.log('\n===================================================');
    console.log('✅ Build successful!');
    console.log(`📱 Release APK generated at:\n   ${apkPath}`);
    console.log('===================================================\n');
  } else if (target === 'debug') {
    console.log('📦 Building Android Debug APK...');
    execSync(`${gradlewCmd} assembleDebug`, { cwd: androidDir, stdio: 'inherit' });
    const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    console.log('\n===================================================');
    console.log('✅ Build successful!');
    console.log(`📱 Debug APK generated at:\n   ${apkPath}`);
    console.log('===================================================\n');
  } else if (target === 'bundle' || target === 'aab') {
    console.log('📦 Building Android Release Bundle (AAB)...');
    execSync(`${gradlewCmd} bundleRelease`, { cwd: androidDir, stdio: 'inherit' });
    const aabPath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
    console.log('\n===================================================');
    console.log('✅ Build successful!');
    console.log(`📦 Release AAB Bundle generated at:\n   ${aabPath}`);
    console.log('===================================================\n');
  } else if (target === 'web') {
    console.log('🌐 Exporting Web Production Build...');
    execSync('npx expo export', { cwd: rootDir, stdio: 'inherit' });
    console.log('\n===================================================');
    console.log('✅ Build successful!');
    console.log('🌐 Static Web files exported to: dist/');
    console.log('===================================================\n');
  } else if (target === 'clean') {
    console.log('🧹 Cleaning Android build cache...');
    execSync(`${gradlewCmd} clean`, { cwd: androidDir, stdio: 'inherit' });
    console.log('\n===================================================');
    console.log('✅ Android build cache cleaned!');
    console.log('===================================================\n');
  } else {
    console.log(`❌ Unknown build target: '${target}'`);
    console.log('\nAvailable build targets:');
    console.log('  node scripts/build.js apk       (Build Release APK)');
    console.log('  node scripts/build.js debug     (Build Debug APK)');
    console.log('  node scripts/build.js bundle    (Build Android App Bundle AAB)');
    console.log('  node scripts/build.js web       (Build Web Static Files)');
    console.log('  node scripts/build.js clean     (Clean native build directory)\n');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Build process failed:', error.message);
  process.exit(1);
}
