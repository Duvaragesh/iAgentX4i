import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListObjectsTool } from '../../../tools/listObjects.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new ListObjectsTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const objRow = {
  OBJNAME: 'MYPGM', OBJTYPE: '*PGM', OBJATTRIBUTE: 'RPGLE',
  OBJTEXT: 'My program', OBJOWNER: 'OWNER', OBJSIZE: 8192,
  LAST_USED_TIMESTAMP: '2024-01-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue([objRow]);
});

describe('ListObjectsTool', () => {
  it('returns object list', async () => {
    const data = parse(await invoke({ library: 'MYLIB' }));
    expect(data.library).toBe('MYLIB');
    expect(data.total).toBe(1);
    expect(data.objects[0].name).toBe('MYPGM');
    expect(data.objects[0].attribute).toBe('RPGLE');
  });

  it('defaults to *ALL object type', async () => {
    await invoke({ library: 'MYLIB' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("OBJECT_TYPE => '*ALL'");
  });

  it('uses specified object type', async () => {
    await invoke({ library: 'MYLIB', objectType: '*PGM' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("OBJECT_TYPE => '*PGM'");
  });

  it('applies nameFilter with wildcard', async () => {
    await invoke({ library: 'MYLIB', nameFilter: 'MY*' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("OBJNAME LIKE 'MY%'");
  });
});
