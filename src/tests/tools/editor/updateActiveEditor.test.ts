import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateActiveEditorTool } from '../../../tools/updateActiveEditor.js';
import * as vscode from '../../__mocks__/vscode.js';
import { mockContent, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new UpdateActiveEditorTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const mockDoc = (scheme: string, path: string) => ({
  uri: { scheme, path, fsPath: path, toString: () => `${scheme}://${path}` },
  lineAt: vi.fn((n: number) => ({
    range: { start: { line: n, character: 0 }, end: { line: n, character: 80 } },
  })),
  lineCount: 2,
  isDirty: false,
  save: vi.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  vi.clearAllMocks();
  (vscode.workspace.applyEdit as any).mockResolvedValue(true);
});

describe('UpdateActiveEditorTool — no active editor', () => {
  it('returns error when no editor open', async () => {
    (vscode.window as any).activeTextEditor = undefined;
    const data = parse(await invoke({ content: 'new content' }));
    expect(data.error).toBe('No active editor');
  });
});

describe('UpdateActiveEditorTool — local file', () => {
  it('applies edit and saves local file', async () => {
    const doc = mockDoc('file', '/c:/src/test.ts');
    (vscode.window as any).activeTextEditor = { document: doc };
    (vscode.workspace.openTextDocument as any).mockResolvedValue(doc);

    const data = parse(await invoke({ content: 'updated content' }));
    expect(data.success).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalled();
  });
});

describe('UpdateActiveEditorTool — IBM i member', () => {
  it('uploads content to IBM i and applies edit', async () => {
    const doc = mockDoc('member', '/MYLIB/QRPGLESRC/HELLO.RPGLE');
    (vscode.window as any).activeTextEditor = { document: doc };
    (vscode.workspace.openTextDocument as any).mockResolvedValue(doc);
    mockContent.uploadMemberContent.mockResolvedValue(undefined);

    const data = parse(await invoke({ content: 'DCL-S X INT;\n' }));
    expect(data.success).toBe(true);
    expect(mockContent.uploadMemberContent).toHaveBeenCalledWith('MYLIB', 'QRPGLESRC', 'HELLO', 'DCL-S X INT;\n');
  });
});
