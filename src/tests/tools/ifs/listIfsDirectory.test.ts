import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListIfsDirectoryTool } from '../../../tools/listIfsDirectory.js';
import { mockContent, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new ListIfsDirectoryTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const sampleFiles = [
  { name: 'script.sh', type: '*STMF', path: '/home/user/script.sh', size: 512, modified: new Date('2024-06-01'), owner: 'MYUSER' },
  { name: 'subdir', type: '*DIR', path: '/home/user/subdir', size: 0, modified: null, owner: 'MYUSER' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockContent.getFileList.mockResolvedValue(sampleFiles);
});

describe('ListIfsDirectoryTool', () => {
  it('returns directory entries', async () => {
    const data = parse(await invoke({ path: '/home/user' }));
    expect(data.path).toBe('/home/user');
    expect(data.total).toBe(2);
    expect(data.entries[0].name).toBe('script.sh');
    expect(data.entries[0].type).toBe('*STMF');
    expect(data.entries[1].lastModified).toBeNull();
  });

  it('maps modified date to ISO string', async () => {
    const data = parse(await invoke({ path: '/home/user' }));
    expect(data.entries[0].lastModified).toBe(new Date('2024-06-01').toISOString());
  });

  it('returns empty when directory is empty', async () => {
    mockContent.getFileList.mockResolvedValue([]);
    const data = parse(await invoke({ path: '/empty' }));
    expect(data.total).toBe(0);
  });
});
