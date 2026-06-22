import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSourceMemberTool } from '../../../tools/getSourceMember.js';
import { mockConnection, mockContent, getConnection } from '../../__mocks__/ibmiConnection.js';
import { LanguageModelToolResult } from '../../__mocks__/vscode.js';

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('DCL-S X INT;\n'),
  default: { readFile: vi.fn().mockResolvedValue('DCL-S X INT;\n') },
}));

function invoke(input: Record<string, unknown>) {
  return new GetSourceMemberTool().invoke({ input } as any, {} as any);
}

function parse(result: LanguageModelToolResult) {
  return JSON.parse(result.getText());
}

beforeEach(() => {
  vi.clearAllMocks();
  mockContent.getMemberList.mockResolvedValue([
    { name: 'HELLO', extension: 'RPGLE', text: 'test member', changed: null, lines: 1 },
  ]);
  mockContent.downloadMemberContent.mockResolvedValue('/tmp/HELLO.rpgle');
  // fs/promises readFile is mocked at module level above
});

describe('GetSourceMemberTool', () => {
  it('returns member content and metadata', async () => {
    const result = await invoke({ library: 'mylib', spf: 'qrpglesrc', member: 'hello' });
    const data = parse(result);
    expect(data.library).toBe('MYLIB');
    expect(data.spf).toBe('QRPGLESRC');
    expect(data.member).toBe('HELLO');
    expect(data.memberType).toBe('RPGLE');
    expect(typeof data.content).toBe('string');
    expect(data.lines).toBeGreaterThan(0);
  });

  it('uppercases library, spf, member names', async () => {
    await invoke({ library: 'mylib', spf: 'qrpglesrc', member: 'hello' });
    expect(mockContent.getMemberList).toHaveBeenCalledWith({
      library: 'MYLIB',
      sourceFile: 'QRPGLESRC',
      members: 'HELLO',
    });
  });

  it('sets empty memberType when member metadata not found', async () => {
    mockContent.getMemberList.mockResolvedValue([]);
    const result = await invoke({ library: 'MYLIB', spf: 'QRPGLESRC', member: 'MISSING' });
    expect(parse(result).memberType).toBe('');
  });

  it('throws when connection is unavailable', async () => {
    getConnection.mockImplementationOnce(() => { throw new Error('No active IBM i connection'); });
    await expect(invoke({ library: 'MYLIB', spf: 'QRPGLESRC', member: 'HELLO' })).rejects.toThrow('No active IBM i connection');
  });
});
