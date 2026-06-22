import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetActiveEditorTool } from '../../../tools/getActiveEditor.js';
import * as vscode from '../../__mocks__/vscode.js';


function invoke() {
  return new GetActiveEditorTool().invoke({ input: {} } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const mockDoc = {
  uri: { scheme: 'file', path: '/c:/Users/test/hello.ts', fsPath: 'c:\\Users\\test\\hello.ts', toString: () => 'file:///c:/Users/test/hello.ts' },
  getText: vi.fn(() => 'const x = 1;\n'),
  isDirty: false,
  lineCount: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDoc);
});

describe('GetActiveEditorTool — no active editor', () => {
  it('returns error when no editor is open', async () => {
    (vscode.window as any).activeTextEditor = undefined;
    const data = parse(await invoke());
    expect(data.error).toBe('No active editor');
  });
});

describe('GetActiveEditorTool — with active editor', () => {
  beforeEach(() => {
    (vscode.window as any).activeTextEditor = { document: mockDoc };
  });

  it('returns content and metadata', async () => {
    const data = parse(await invoke());
    expect(data.content).toBe('const x = 1;\n');
    expect(data.isDirty).toBe(false);
    expect(data.lineCount).toBe(1);
  });

  it('classifies local file URI correctly', async () => {
    const data = parse(await invoke());
    expect(data.scheme).toBe('file');
    expect(data.filePath).toBeDefined();
  });

  it('classifies member URI correctly', async () => {
    const memberDoc = {
      ...mockDoc,
      uri: { scheme: 'member', path: '/MYLIB/QRPGLESRC/HELLO.RPGLE', fsPath: '', toString: () => 'member://MYLIB/QRPGLESRC/HELLO.RPGLE' },
    };
    (vscode.window as any).activeTextEditor = { document: memberDoc };
    (vscode.workspace.openTextDocument as any).mockResolvedValue(memberDoc);
    const data = parse(await invoke());
    expect(data.scheme).toBe('member');
    expect(data.library).toBe('MYLIB');
    expect(data.member).toBe('HELLO');
  });
});
