import { defineConfig } from '@vscode/test-cli';
import { join } from 'path';

// A dedicated user-data dir for integration tests — avoids the VS Code lock conflict
// that occurs when pointing at the real %APPDATA%/Code directory.
// Connection profiles are copied there by: npm run setup:int (runs automatically via test:int).
const testUserDataDir = join(import.meta.dirname ?? '.', '.vscode-test-data');

export default defineConfig({
  files: 'out-int/tests/integration/**/*.test.js',
  workspaceFolder: '.',
  launchArgs: [
    '--user-data-dir', testUserDataDir,
    '--extensions-dir', join(process.env.USERPROFILE, '.vscode', 'extensions'),
  ],
  mocha: {
    timeout: 140000,
    reporter: 'spec',
  },
});
