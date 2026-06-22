import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetLibraryListTool } from '../../../tools/getLibraryList.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke() {
  return new GetLibraryListTool().invoke({ input: {} } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue([
    { SYSTEM_SCHEMA_NAME: 'QSYS', TYPE: '*SYS', SCHEMA_POSITION: 1, SCHEMA_TEXT: 'System library' },
    { SYSTEM_SCHEMA_NAME: 'MYLIB', TYPE: '*USR', SCHEMA_POSITION: 5, SCHEMA_TEXT: 'My library' },
  ]);
});

describe('GetLibraryListTool', () => {
  it('returns library list with correct shape', async () => {
    const data = parse(await invoke());
    expect(data.total).toBe(2);
    expect(data.libraries[0].library).toBe('QSYS');
    expect(data.libraries[0].type).toBe('*SYS');
    expect(data.libraries[0].position).toBe(1);
  });

  it('queries QSYS2.LIBRARY_LIST_INFO', async () => {
    await invoke();
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain('QSYS2.LIBRARY_LIST_INFO');
  });

  it('returns empty list when no libraries', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    const data = parse(await invoke());
    expect(data.total).toBe(0);
  });
});
