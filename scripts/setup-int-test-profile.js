#!/usr/bin/env node
/**
 * Creates a minimal VS Code user-data dir for integration tests.
 * Copies only the code-for-ibmi.* settings from the real VS Code settings.json
 * so the test instance has all saved IBM i connection profiles.
 */

const fs = require('fs');
const path = require('path');

const realSettings = path.join(process.env.APPDATA, 'Code', 'User', 'settings.json');
const testUserDataDir = path.join(__dirname, '..', '.vscode-test-data');
const testSettingsDir = path.join(testUserDataDir, 'User');
const testSettingsFile = path.join(testSettingsDir, 'settings.json');

fs.mkdirSync(testSettingsDir, { recursive: true });

let ibmiSettings = {};
try {
  const raw = fs.readFileSync(realSettings, 'utf8');
  const all = JSON.parse(raw);
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith('code-for-ibmi.') || k.startsWith('ibm-iagentx.')) {
      ibmiSettings[k] = v;
    }
  }
  console.log(`Copied ${Object.keys(ibmiSettings).length} code-for-ibmi settings to test profile.`);
} catch (e) {
  console.warn('Could not read real VS Code settings:', e.message);
}

fs.writeFileSync(testSettingsFile, JSON.stringify(ibmiSettings, null, 2), 'utf8');
console.log('Test user-data dir ready:', testUserDataDir);
