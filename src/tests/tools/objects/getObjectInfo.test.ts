import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetObjectInfoTool } from '../../../tools/getObjectInfo.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new GetObjectInfoTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const objRow = {
  OBJNAME: 'MYPGM', OBJTYPE: '*PGM', OBJATTRIBUTE: 'RPGLE',
  OBJTEXT: 'My program', OBJOWNER: 'OWNER', OBJSIZE: 8192,
  OBJCREATED: '2023-01-01', LAST_CHANGED_TIMESTAMP: '2024-01-01',
  LAST_USED_TIMESTAMP: '2024-06-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue([objRow]);
});

describe('GetObjectInfoTool', () => {
  it('returns object details when found', async () => {
    const data = parse(await invoke({ library: 'MYLIB', name: 'MYPGM', objectType: '*PGM' }));
    expect(data.exists).toBe(true);
    expect(data.name).toBe('MYPGM');
    expect(data.owner).toBe('OWNER');
    expect(data.size).toBe(8192);
  });

  it('returns exists=false when not found', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    const data = parse(await invoke({ library: 'MYLIB', name: 'NOTHERE', objectType: '*PGM' }));
    expect(data.exists).toBe(false);
    expect(data.library).toBe('MYLIB');
  });
});
