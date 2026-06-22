import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchIfsTool } from '../../../tools/searchIfs.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new SearchIfsTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

beforeEach(() => {
  vi.clearAllMocks();
  // First call: file enumeration, subsequent calls: line search
  mockConnection.runSQL
    .mockResolvedValueOnce([
      { PATH_NAME: '/home/user/file1.txt', DATA_SIZE: 100 },
      { PATH_NAME: '/home/user/file2.log', DATA_SIZE: 200 },
    ])
    .mockResolvedValue([{ LINE: 'found the term here' }]);
});

describe('SearchIfsTool', () => {
  it('returns matching files', async () => {
    const data = parse(await invoke({ path: '/home/user', searchTerm: 'term' }));
    expect(data.total).toBe(2);
    expect(data.matchingFiles[0].path).toBe('/home/user/file1.txt');
    expect(data.matchingFiles[0].sampleLines).toContain('found the term here');
  });

  it('applies filePattern filter', async () => {
    mockConnection.runSQL
      .mockResolvedValueOnce([
        { PATH_NAME: '/home/user/file1.txt', DATA_SIZE: 100 },
        { PATH_NAME: '/home/user/file2.log', DATA_SIZE: 200 },
      ])
      .mockResolvedValue([{ LINE: 'match' }]);
    const data = parse(await invoke({ path: '/home/user', searchTerm: 'x', filePattern: '*.txt' }));
    expect(data.matchingFiles.every((f: any) => f.path.endsWith('.txt'))).toBe(true);
  });

  it('respects maxFiles cap', async () => {
    const manyFiles = Array.from({ length: 10 }, (_, i) => ({
      PATH_NAME: `/home/user/file${i}.txt`, DATA_SIZE: 50,
    }));
    mockConnection.runSQL.mockReset();
    mockConnection.runSQL
      .mockResolvedValueOnce(manyFiles)
      .mockResolvedValue([{ LINE: 'hit' }]);
    const data = parse(await invoke({ path: '/home', searchTerm: 'hit', maxFiles: 3 }));
    expect(data.total).toBeLessThanOrEqual(3);
  });

  it('skips files that return no matches', async () => {
    mockConnection.runSQL.mockReset();
    mockConnection.runSQL
      .mockResolvedValueOnce([{ PATH_NAME: '/home/user/empty.txt', DATA_SIZE: 10 }])
      .mockResolvedValueOnce([]);
    const data = parse(await invoke({ path: '/home/user', searchTerm: 'nothing' }));
    expect(data.total).toBe(0);
  });
});
