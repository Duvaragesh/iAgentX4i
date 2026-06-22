import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    exclude: ['src/tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/extension.ts'],
    },
  },
  resolve: {
    alias: [
      { find: 'vscode', replacement: path.resolve(__dirname, 'src/tests/__mocks__/vscode.ts') },
      // Redirect any import of ibmiConnection(.js) to the mock (regardless of relative depth)
      {
        find: /^.*[/\\]ibmiConnection(\.js)?$/,
        replacement: path.resolve(__dirname, 'src/tests/__mocks__/ibmiConnection.ts'),
      },
    ],
  },
});
