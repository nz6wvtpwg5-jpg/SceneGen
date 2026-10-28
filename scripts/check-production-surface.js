const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const forbiddenPages = [
  'src/app/admin/fix-budgets/page.tsx',
  'src/app/test-calendar/page.tsx',
  'src/app/test-maps/page.tsx',
];
const forbiddenArtifacts = [
  'src/app/shows/page.tsx.gridwidth',
  'src/app/shows/page.tsx.backup-rightrail-v1',
  'src/app/shows/page.tsx.backup-before-compact-rail',
  'src/app/shows/page.tsx.backup-before-rightrail',
  'src/components/header/app-header.tsx.backup-before-compact',
];
const failures = forbiddenPages.filter((file) => fs.existsSync(path.join(root, file)))
  .map((file) => `${file}: development-only page must not ship`);
failures.push(...forbiddenArtifacts.filter((file) => fs.existsSync(path.join(root, file)))
  .map((file) => `${file}: backup source artifact must not ship`));

const renderBlueprint = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
const releaseWorkflow = fs.readFileSync(path.join(root, '.github/workflows/release-validation.yml'), 'utf8');
const branchDeclarations = renderBlueprint.match(/^\s+branch:\s+Jon\/Newstuff\s*$/gm) || [];
const autoDeployDeclarations = renderBlueprint.match(/^\s+autoDeployTrigger:\s+checksPass\s*$/gm) || [];
if (branchDeclarations.length !== 2 || autoDeployDeclarations.length !== 2) {
  failures.push('render.yaml: both production services must auto-deploy Jon/Newstuff after CI checks pass');
}
if (!/branches:\s*\[[^\]]*Jon\/Newstuff[^\]]*\]/.test(releaseWorkflow)) {
  failures.push('.github/workflows/release-validation.yml: Jon/Newstuff must run release validation for Render auto-deploys');
}

const sourceRoot = path.join(root, 'src');
const applicationRoots = [sourceRoot, path.join(root, 'backend')];
const forbiddenText = [
  ['access-token logging', /console\.(?:log|error)\([^\n]*(?:access\s*token|authorization)[^\n]*(?:substring|accessToken)/i],
  ['raw import payload logging', /console\.log\([^\n]*importing data/i],
  ['raw Google distance error response', /data\.error_message/],
  ['placeholder profile video', /Video Placeholder/i],
  ['hard-coded demo discography', /War Girlfriend Records/i],
  ['placeholder profile asset link', /href=["']#["']/],
  ['nonfunctional EPK download', /Download EPK as Zip/i],
  ['temporary debug data logging', /console\.log\([^\n]*(?:DEBUG:|TEST SAVE|first show sample|All budgets)/i],
];
const canonicalContactConsumers = [
  'src/components/contacts/ContactSearch.tsx',
  'src/components/contacts/ConnectionRequest.tsx',
  'src/app/contacts/add/page.tsx',
];
const retiredContactRoutes = [
  'src/app/api/connections/accept/[id]/route.ts',
  'src/app/api/connections/request/route.ts',
  'src/app/api/contact/add/route.ts',
  'src/app/api/contact/delete/[id]/route.ts',
  'src/app/api/contact/delete/route.ts',
  'src/app/api/contact/list/route.ts',
  'src/app/api/user/connections/get/route.ts',
];
for (const file of canonicalContactConsumers) {
  const contents = fs.readFileSync(path.join(root, file), 'utf8');
  if (/\/api\/connections|\/api\/contact\/add/.test(contents)) {
    failures.push(`${file}: legacy contact API consumer`);
  }
}
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'test') visit(full);
    else if (/\.(ts|tsx|js)$/.test(entry.name)) {
      const contents = fs.readFileSync(full, 'utf8');
      for (const [label, pattern] of forbiddenText) {
        if (pattern.test(contents)) failures.push(`${path.relative(root, full)}: ${label}`);
      }
      const relative = path.relative(root, full).replace(/\\/g, '/');
      if (/session\??\.access_token|session-authenticated/.test(contents)) {
        failures.push(`${relative}: legacy browser session token`);
      }
      if (!relative.startsWith('src/app/api/') && /Authorization['"]?\s*:\s*`Bearer \$\{(?:session|accessToken)/.test(contents)) {
        failures.push(`${relative}: browser-generated bearer authorization`);
      }
      if (!relative.startsWith('src/app/api/') && /\/api\/(?:connections(?:\/|['"`])|contact\/(?:add|delete))/.test(contents)) {
        failures.push(`${relative}: legacy contact API consumer`);
      }
    }
  }
}
visit(sourceRoot);

const credentialPatterns = [
  ['embedded Google API credential', /AIza[0-9A-Za-z_-]{20,}/],
  ['embedded Resend API credential', /\bre_[0-9A-Za-z]{20,}\b/],
  ['embedded private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['embedded database credential', /(?:postgres(?:ql)?|mysql):\/\/[^\s:@/]+:[^\s@/]+@/i],
];
const repositoryFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root })
  .toString('utf8').split('\0').filter(Boolean);
for (const relative of repositoryFiles) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
  const buffer = fs.readFileSync(full);
  if (buffer.includes(0)) continue;
  const contents = buffer.toString('utf8');
  for (const [label, pattern] of credentialPatterns) {
    const globalPattern = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
    if (globalPattern.test(contents)) failures.push(`${relative}: ${label}`);
  }
}

for (const relative of retiredContactRoutes) {
  if (fs.existsSync(path.join(root, relative))) {
    failures.push(`${relative}: retired contact route is still deployable`);
  }
}
if (failures.length) {
  console.error('Unsafe production surface detected:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('Production surface checks passed.');
