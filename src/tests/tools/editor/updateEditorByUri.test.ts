import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateEditorByUriTool } from '../../../tools/updateEditorByUri.js';
import * as vscode from '../../__mocks__/vscode.js';
import { mockContent, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new UpdateEditorByUriTool().invoke({ input } as any, {} as any);
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

describe('UpdateEditorByUriTool', () => {
  it('updates a file URI', async () => {
    const doc = mockDoc('file', '/c:/src/test.ts');
    (vscode.workspace.openTextDocument as any).mockResolvedValue(doc);
    vscode.Uri.parse.mockReturnValue(doc.uri as any);

    const data = parse(await invoke({ uri: 'file:///c:/src/test.ts', content: 'updated' }));
    expect(data.success).toBe(true);
    expect(data.uri).toBe('file:///c:/src/test.ts');
  });

  it('updates an IFS streamfile URI', async () => {
    const doc = mockDoc('streamfile', '/home/user/script.sh');
    (vscode.workspace.openTextDocument as any).mockResolvedValue(doc);
    vscode.Uri.parse.mockReturnValue(doc.uri as any);
    mockContent.writeStreamfileRaw.mockResolvedValue(undefined);

    const data = parse(await invoke({ uri: 'streamfile:///home/user/script.sh', content: '#!/bin/sh\n' }));
    expect(data.success).toBe(true);
    expect(mockContent.writeStreamfileRaw).toHaveBeenCalledWith('/home/user/script.sh', '#!/bin/sh\n');
  });
});
