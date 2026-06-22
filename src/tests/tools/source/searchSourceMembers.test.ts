import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchSourceMembersTool } from '../../../tools/searchSourceMembers.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new SearchSourceMembersTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const primaryHit = {
  SOURCE_FILE_LIBRARY: 'MYLIB',
  SOURCE_FILE: 'QRPGLESRC',
  SOURCE_MEMBER: 'HELLO',
  SOURCE_SEQ_NBR: 5,
  SOURCE_DATA: '  DCL-S found VARCHAR(10);',
};

beforeEach(() => vi.clearAllMocks());

describe('SearchSourceMembersTool — primary path', () => {
  it('returns hits from SYSTOOLS.SEARCH_SOURCE', async () => {
    mockConnection.runSQL.mockResolvedValue([primaryHit]);
    const data = parse(await invoke({ library: 'MYLIB', spf: 'QRPGLESRC', searchTerm: 'found' }));
    expect(data.total).toBe(1);
    expect(data.hits[0].member).toBe('HELLO');
    expect(data.hits[0].lineNumber).toBe(5);
  });

  it('respects maxResults cap (500 max)', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    await invoke({ library: 'MYLIB', spf: 'QRPGLESRC', searchTerm: 'x', maxResults: 600 });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain('FETCH FIRST 500 ROWS ONLY');
  });

  it('applies memberFilter to query', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    await invoke({ library: 'MYLIB', spf: 'QRPGLESRC', searchTerm: 'x', memberFilter: 'HE*' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("MEMBER => 'HE%'");
  });
});

describe('SearchSourceMembersTool — fallback path', () => {
  it('falls back to member iteration when SYSTOOLS unavailable', async () => {
    // First call (SYSTOOLS) throws, second (member list) returns one member,
    // third (line query) returns one match
    mockConnection.runSQL
      .mockRejectedValueOnce(new Error('SQL0204'))
      .mockResolvedValueOnce([{ SOURCE_MEMBER: 'HELLO' }])
      .mockResolvedValueOnce([{ SOURCE_SEQ_NBR: 3, SOURCE_DATA: 'found text' }]);

    const data = parse(await invoke({ library: 'MYLIB', spf: 'QRPGLESRC', searchTerm: 'found' }));
    expect(data.total).toBe(1);
    expect(data.hits[0].member).toBe('HELLO');
  });

  it('returns empty when fallback member list also fails', async () => {
    mockConnection.runSQL
      .mockRejectedValueOnce(new Error('SYSTOOLS error'))
      .mockRejectedValueOnce(new Error('QSYS2 error'));
    const data = parse(await invoke({ library: 'MYLIB', spf: 'QRPGLESRC', searchTerm: 'x' }));
    expect(data.total).toBe(0);
  });
});
