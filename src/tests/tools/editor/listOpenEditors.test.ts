import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListOpenEditorsTool } from '../../../tools/listOpenEditors.js';
import * as vscode from '../../__mocks__/vscode.js';


function invoke() {
  return new ListOpenEditorsTool().invoke({ input: {} } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const makeEditor = (scheme: string, path: string, isDirty = false) => ({
  document: {
    uri: { scheme, path, fsPath: path, toString: () => `${scheme}:${path}` },
    isDirty,
    lineCount: 5,
  },
});

beforeEach(() => vi.clearAllMocks());

describe('ListOpenEditorsTool', () => {
  it('returns empty array when no editors open', async () => {
    (vscode.window as any).visibleTextEditors = [];
    (vscode.window as any).activeTextEditor = undefined;
    const data = parse(await invoke());
    expect(data).toHaveLength(0);
  });

  it('lists visible editors with metadata', async () => {
    const e1 = makeEditor('file', '/c:/src/app.ts');
    const e2 = makeEditor('streamfile', '/home/user/script.sh', true);
    (vscode.window as any).visibleTextEditors = [e1, e2];
    (vscode.window as any).activeTextEditor = e1;

    const data = parse(await invoke());
    expect(data).toHaveLength(2);
    expect(data[0].isActive).toBe(true);
    expect(data[1].isActive).toBe(false);
    expect(data[1].isDirty).toBe(true);
  });

  it('marks member scheme correctly', async () => {
    const e = makeEditor('member', '/MYLIB/QRPGLESRC/HELLO.RPGLE');
    (vscode.window as any).visibleTextEditors = [e];
    (vscode.window as any).activeTextEditor = undefined;

    const data = parse(await invoke());
    expect(data[0].scheme).toBe('member');
    expect(data[0].library).toBe('MYLIB');
  });
});
