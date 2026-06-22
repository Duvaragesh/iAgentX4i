import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListSourceFilesTool } from '../../../tools/listSourceFiles.js';
import { mockContent, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new ListSourceFilesTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

beforeEach(() => {
  vi.clearAllMocks();
  mockContent.getObjectList.mockResolvedValue([
    { name: 'QRPGLESRC', sourceFile: true, text: 'RPG source' },
    { name: 'QCLSRC', sourceFile: true, text: 'CL source' },
    { name: 'CUSTFILE', sourceFile: false, text: 'Data file' },
  ]);
});

describe('ListSourceFilesTool', () => {
  it('filters to source files only', async () => {
    const data = parse(await invoke({ library: 'MYLIB' }));
    expect(data.total).toBe(2);
    expect(data.files.map((f: any) => f.name)).toEqual(['QRPGLESRC', 'QCLSRC']);
  });

  it('requests *FILE type from API', async () => {
    await invoke({ library: 'mylib' });
    expect(mockContent.getObjectList).toHaveBeenCalledWith({ library: 'MYLIB', types: ['*FILE'] });
  });

  it('uppercases library', async () => {
    await invoke({ library: 'testlib' });
    expect(mockContent.getObjectList).toHaveBeenCalledWith(expect.objectContaining({ library: 'TESTLIB' }));
  });

  it('returns empty list when no source files exist', async () => {
    mockContent.getObjectList.mockResolvedValue([{ name: 'DATA', sourceFile: false }]);
    const data = parse(await invoke({ library: 'MYLIB' }));
    expect(data.total).toBe(0);
  });
});
