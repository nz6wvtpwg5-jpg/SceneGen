import fs from 'node:fs';

const required = [
  'ios/App/App/PrivacyInfo.xcprivacy', 'ios/App/App/App.entitlements', 'APP_STORE_SUBMISSION.md',
  'src/app/error.tsx', 'src/app/global-error.tsx', 'src/app/loading.tsx',
  'src/app/api/user/delete-account/route.ts', 'backend/migrations/048_release_readiness.sql'
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Release file missing: ${file}`);
const capacitor = fs.readFileSync('capacitor.config.ts', 'utf8');
const project = fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
const privacy = fs.readFileSync('ios/App/App/PrivacyInfo.xcprivacy', 'utf8');
const nativeFallback = fs.readFileSync('native-web/index.html', 'utf8');
if (/http:\/\//.test(capacitor)) throw new Error('Native production configuration contains cleartext HTTP');
if (!/PRODUCT_BUNDLE_IDENTIFIER = io\.scenegen\.app/.test(project)) throw new Error('Release bundle identifier changed');
if (!/TARGETED_DEVICE_FAMILY = 1/.test(project)) throw new Error('Release target is not iPhone-only');
if (!/NSPrivacyTracking[\s\S]*<false\/>/.test(privacy)) throw new Error('Privacy manifest tracking declaration missing');
if (!/setTimeout\([\s\S]*12000/.test(nativeFallback)) throw new Error('Native unavailable-server fallback missing');
console.log('iOS release surface checks passed.');
