import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckObjectTool } from '../../../tools/checkObject.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new CheckObjectTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

beforeEach(() => vi.clearAllMocks());

describe('CheckObjectTool', () => {
  it('returns exists=true with attribute when found', async () => {
    mockConnection.runSQL.mockResolvedValue([
      { OBJNAME: 'MYFILE', OBJATTRIBUTE: 'PF', OBJTEXT: 'Physical file' },
    ]);
    const data = parse(await invoke({ library: 'MYLIB', name: 'MYFILE', objectType: '*FILE' }));
    expect(data.exists).toBe(true);
    expect(data.attribute).toBe('PF');
    expect(data.description).toBe('Physical file');
  });

  it('returns exists=false when not found', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    const data = parse(await invoke({ library: 'MYLIB', name: 'GHOST', objectType: '*PGM' }));
    expect(data.exists).toBe(false);
    expect(data.attribute).toBeUndefined();
  });
});
