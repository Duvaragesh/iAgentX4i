import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListSourceMembersTool } from '../../../tools/listSourceMembers.js';
import { mockContent, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new ListSourceMembersTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

beforeEach(() => {
  vi.clearAllMocks();
  mockContent.getMemberList.mockResolvedValue([
    { name: 'HELLO', extension: 'RPGLE', text: 'Hello program', changed: new Date('2024-01-01'), lines: 10 },
    { name: 'WORLD', extension: 'CLLE', text: 'World CL', changed: null, lines: null },
  ]);
});

describe('ListSourceMembersTool', () => {
  it('returns member list with correct shape', async () => {
    const data = parse(await invoke({ library: 'MYLIB', spf: 'QRPGLESRC' }));
    expect(data.library).toBe('MYLIB');
    expect(data.spf).toBe('QRPGLESRC');
    expect(data.total).toBe(2);
    expect(data.members[0].name).toBe('HELLO');
    expect(data.members[0].type).toBe('RPGLE');
    expect(data.members[0].lastModified).toBe(new Date('2024-01-01').toISOString());
    expect(data.members[1].lastModified).toBeNull();
    expect(data.members[1].lines).toBeNull();
  });

  it('passes filter to getMemberList', async () => {
    await invoke({ library: 'MYLIB', spf: 'QRPGLESRC', filter: 'HE*' });
    expect(mockContent.getMemberList).toHaveBeenCalledWith(
      expect.objectContaining({ members: 'HE*' })
    );
  });

  it('returns empty list when no members found', async () => {
    mockContent.getMemberList.mockResolvedValue([]);
    const data = parse(await invoke({ library: 'MYLIB', spf: 'QRPGLESRC' }));
    expect(data.total).toBe(0);
    expect(data.members).toHaveLength(0);
  });

  it('throws on connection failure', async () => {
    getConnection.mockImplementationOnce(() => { throw new Error('Not connected'); });
    await expect(invoke({ library: 'MYLIB', spf: 'QRPGLESRC' })).rejects.toThrow('Not connected');
  });
});
