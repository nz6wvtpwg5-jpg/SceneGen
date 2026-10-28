const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'src');
const apiRoot = path.join(root, 'app', 'api');
const applicationForbidden = [
  ['Azure subscription header', /Ocp-Apim-Subscription-Key/g],
  ['Azure subscription variable', /SUBSCRIPTION_KEY/g],
  ['public backend URL variable', /NEXT_PUBLIC_BACKEND_URL/g],
  ['public API URL variable', /NEXT_PUBLIC_API_URL/g],
  ['obsolete Python backend port', /localhost:8000/g],
];
const apiForbidden = [
  ['hard-coded private backend port', /localhost:3001/g],
  ['direct backend environment access', /process\.env\.(?:BACKEND_URL|BACKEND_HOSTPORT)/g],
  ['compatibility session access token', /session\.access_token/g],
];
const failures = [];
function visit(directory, forbidden) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const full = path.join(directory, entry.name); if (entry.isDirectory()) visit(full, forbidden); else if (/\.(ts|tsx|js)$/.test(entry.name)) { const text = fs.readFileSync(full, 'utf8'); for (const [label, pattern] of forbidden) { pattern.lastIndex = 0; if (pattern.test(text)) failures.push(`${path.relative(process.cwd(), full)}: ${label}`); } } } }
visit(root, applicationForbidden);
visit(apiRoot, apiForbidden);
if (failures.length) { console.error('Legacy API configuration detected:\n' + failures.join('\n')); process.exit(1); }
console.log('No legacy public/Azure configuration detected in application source.');
