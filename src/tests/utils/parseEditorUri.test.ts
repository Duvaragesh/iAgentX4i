import { describe, it, expect } from 'vitest';
import { parseEditorUri } from '../../utils/parseEditorUri.js';
import { Uri } from '../__mocks__/vscode.js';

function makeUri(scheme: string, path: string, fsPath?: string) {
  return { scheme, path, fsPath: fsPath ?? path, toString: () => `${scheme}:${path}` } as any;
}

describe('parseEditorUri', () => {
  it('parses member URI with extension', () => {
    const uri = makeUri('member', '/MYLIB/QRPGLESRC/HELLO.RPGLE');
    const info = parseEditorUri(uri);
    expect(info.scheme).toBe('member');
    if (info.scheme === 'member') {
      expect(info.library).toBe('MYLIB');
      expect(info.sourceFile).toBe('QRPGLESRC');
      expect(info.member).toBe('HELLO');
      expect(info.type).toBe('RPGLE');
    }
  });

  it('parses member URI without extension', () => {
    const uri = makeUri('member', '/MYLIB/QRPGLESRC/HELLO');
    const info = parseEditorUri(uri);
    expect(info.scheme).toBe('member');
    if (info.scheme === 'member') {
      expect(info.member).toBe('HELLO');
      expect(info.type).toBe('');
    }
  });

  it('parses streamfile URI', () => {
    const uri = makeUri('streamfile', '/home/user/myscript.sh');
    const info = parseEditorUri(uri);
    expect(info.scheme).toBe('streamfile');
    if (info.scheme === 'streamfile') {
      expect(info.ifsPath).toBe('/home/user/myscript.sh');
    }
  });

  it('parses local file URI', () => {
    const uri = makeUri('file', '/c:/Users/test/file.ts', 'c:\\Users\\test\\file.ts');
    const info = parseEditorUri(uri);
    expect(info.scheme).toBe('file');
    if (info.scheme !== 'member' && info.scheme !== 'streamfile') {
      expect(info.filePath).toBe('c:\\Users\\test\\file.ts');
    }
  });

  it('throws for malformed member URI (too few parts)', () => {
    const uri = makeUri('member', '/MYLIB/QRPGLESRC');
    expect(() => parseEditorUri(uri)).toThrow('Unexpected member URI path');
  });
});
