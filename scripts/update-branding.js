const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const sourceImage = path.join(rootDir, '.vscode', 'image.png');
const imagesDir = path.join(rootDir, 'assets', 'images');

if (!fs.existsSync(sourceImage)) {
  console.error('Source image not found:', sourceImage);
  process.exit(1);
}

const targets = [
  'icon.png',
  'android-icon-foreground.png',
  'splash-icon.png',
  'favicon.png'
];

console.log('🖼️ Copying new logo from .vscode/image.png to assets/images/...');
targets.forEach(target => {
  const dest = path.join(imagesDir, target);
  fs.copyFileSync(sourceImage, dest);
  console.log(` ✅ Updated ${target}`);
});

console.log('\n⚙️ Updating Android native assets via Expo prebuild...');
try {
  execSync('npx expo prebuild --platform android', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Android native assets updated successfully!');
} catch (err) {
  console.error('⚠️ Expo prebuild notice:', err.message);
}
