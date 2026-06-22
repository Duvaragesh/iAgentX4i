import * as assert from 'assert';
import * as vscode from 'vscode';
import { before, suite, test, suiteSetup } from 'mocha';

/**
 * Integration tests — run inside the VS Code extension host via @vscode/test-cli.
 *
 * When the test window opens:
 *  1. A notification appears — click "Connect to IBM i" to open the connection picker
 *  2. Tests wait up to 2 minutes for the connection to become active
 *  3. Once connected, all suites run against the real IBM i system
 *  4. If no connection is established within 2 minutes, all tests skip (exit 0)
 *
 * Run:  npm run test:int
 */

function getText(result: vscode.LanguageModelToolResult): string {
  return result.content
    .filter((p): p is vscode.LanguageModelTextPart => p instanceof vscode.LanguageModelTextPart)
    .map(p => p.value)
    .join('');
}

async function isConnected(): Promise<boolean> {
  try {
    const { getConnection } = await import('../../ibmiConnection.js');
    getConnection();
    return true;
  } catch {
    return false;
  }
}

// ─── Global setup — runs once before all suites ───────────────────────────────

let connected = false;

before(async function () {
  this.timeout(130_000); // 2 min + buffer

  if (await isConnected()) {
    connected = true;
    return;
  }

  // Prompt user in the test window
  vscode.window.showInformationMessage(
    'IBM i integration tests: connect to IBM i to run the tests (waiting up to 2 minutes).',
    'Connect to IBM i'
  ).then(selection => {
    if (selection === 'Connect to IBM i') {
      vscode.commands.executeCommand('code-for-ibmi.connect');
    }
  });

  // Poll every 3 seconds for up to 2 minutes
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    if (await isConnected()) {
      connected = true;
      return;
    }
  }

  // Timed out — all suites will skip
  vscode.window.showWarningMessage('IBM i not connected — integration tests skipped.');
});

// ─── connectionStatus ────────────────────────────────────────────────────────

suite('IBM i integration — connectionStatus', function () {
  suiteSetup(function () { if (!connected) { this.skip(); } });

  test('returns connected status from real system', async () => {
    const { ConnectionStatusTool } = await import('../../tools/connectionStatus.js');
    const result = await new ConnectionStatusTool().invoke({ input: {} } as any, {} as any);
    const data = JSON.parse(getText(result));
    assert.strictEqual(data.connected, true, 'Expected IBM i to be connected');
    assert.ok(data.host, 'Expected host to be set');
    assert.ok(data.user, 'Expected user to be set');
  });
});

// ─── runSql ──────────────────────────────────────────────────────────────────

suite('IBM i integration — runSql', function () {
  suiteSetup(function () { if (!connected) { this.skip(); } });

  test('executes SELECT against QSYS2.LIBRARY_LIST_INFO', async () => {
    const { RunSqlTool } = await import('../../tools/runSql.js');
    const result = await new RunSqlTool().invoke(
      { input: { query: 'SELECT SYSTEM_SCHEMA_NAME FROM QSYS2.LIBRARY_LIST_INFO FETCH FIRST 5 ROWS ONLY' } } as any,
      {} as any
    );
    const data = JSON.parse(getText(result));
    assert.ok(data.rowCount > 0, 'Expected at least one row');
    assert.ok('SYSTEM_SCHEMA_NAME' in data.rows[0], 'Expected SYSTEM_SCHEMA_NAME column');
  });

  test('blocks INSERT statement', async () => {
    const { RunSqlTool } = await import('../../tools/runSql.js');
    await assert.rejects(
      () => new RunSqlTool().invoke(
        { input: { query: 'INSERT INTO QTEMP.X VALUES (1)' } } as any, {} as any
      ),
      /Only SELECT statements are allowed/
    );
  });

  test('pagination: maxRows and offset', async () => {
    const { RunSqlTool } = await import('../../tools/runSql.js');
    const result = await new RunSqlTool().invoke(
      { input: { query: 'SELECT SYSTEM_SCHEMA_NAME FROM QSYS2.LIBRARY_LIST_INFO', maxRows: 2, offset: 0 } } as any,
      {} as any
    );
    const data = JSON.parse(getText(result));
    assert.ok(data.rowCount <= 2, 'Expected at most 2 rows');
    assert.strictEqual(data.offset, 0);
  });
});

// ─── getLibraryList ──────────────────────────────────────────────────────────

suite('IBM i integration — getLibraryList', function () {
  suiteSetup(function () { if (!connected) { this.skip(); } });

  test('returns real library list containing QGPL', async () => {
    const { GetLibraryListTool } = await import('../../tools/getLibraryList.js');
    const result = await new GetLibraryListTool().invoke({ input: {} } as any, {} as any);
    const data = JSON.parse(getText(result));
    assert.ok(data.total > 0, 'Expected at least one library');
    assert.ok(
      data.libraries.some((l: any) => l.library === 'QGPL'),
      'Expected QGPL in library list'
    );
  });
});

// ─── listSourceFiles ─────────────────────────────────────────────────────────

suite('IBM i integration — listSourceFiles', function () {
  suiteSetup(function () { if (!connected) { this.skip(); } });

  test('lists source files in QSYS', async () => {
    const { ListSourceFilesTool } = await import('../../tools/listSourceFiles.js');
    const result = await new ListSourceFilesTool().invoke(
      { input: { library: 'QSYS' } } as any, {} as any
    );
    const data = JSON.parse(getText(result));
    assert.strictEqual(data.library, 'QSYS');
    assert.ok(data.total >= 0, 'Expected non-negative total');
  });
});
