import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetProgramInfoTool } from '../../../tools/getProgramInfo.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new GetProgramInfoTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const pgmRow = {
  OBJNAME: 'MYPGM', OBJTYPE: '*PGM', OBJATTRIBUTE: 'RPGLE',
  OBJTEXT: 'My program', OBJOWNER: 'OWNER', OBJSIZE: 10240,
  OBJCREATED: '2023-01-01', LAST_CHANGED_TIMESTAMP: '2024-01-01',
  PROGRAM_ATTRIBUTE: 'RPGLE', TARGET_RELEASE: 'V7R4M0', ACTIVATION_GROUP: '*CALLER',
};
const moduleRow = { BOUND_MODULE_LIBRARY: 'MYLIB', BOUND_MODULE: 'MYMOD', MODULE_ATTRIBUTE: 'RPGLE' };

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL
    .mockResolvedValueOnce([pgmRow])
    .mockResolvedValueOnce([moduleRow]);
});

describe('GetProgramInfoTool', () => {
  it('returns program info with bound modules', async () => {
    const data = parse(await invoke({ library: 'MYLIB', program: 'MYPGM' }));
    expect(data.exists).toBe(true);
    expect(data.programAttribute).toBe('RPGLE');
    expect(data.targetRelease).toBe('V7R4M0');
    expect(data.boundModules).toHaveLength(1);
    expect(data.boundModules[0].module).toBe('MYMOD');
  });

  it('returns exists=false when not found', async () => {
    mockConnection.runSQL.mockReset().mockResolvedValue([]);
    const data = parse(await invoke({ library: 'MYLIB', program: 'GHOST' }));
    expect(data.exists).toBe(false);
    expect(data.boundModules).toHaveLength(0);
  });

  it('throws for invalid objectType', async () => {
    await expect(invoke({ library: 'MYLIB', program: 'MYPGM', objectType: '*FILE' }))
      .rejects.toThrow('objectType must be *PGM or *SRVPGM');
  });

  it('defaults to *PGM when objectType not provided', async () => {
    await invoke({ library: 'MYLIB', program: 'MYPGM' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("OBJECT_TYPE => '*PGM'");
  });
});
