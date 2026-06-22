import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetIfsFileTool } from '../../../tools/getIfsFile.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';

vi.mock('../../../utils/ifsRead.js', () => ({
  readIfsAsText: vi.fn().mockResolvedValue({ text: 'hello world\n', encoding: 'utf-8' }),
}));

function invoke(input: Record<string, unknown>) {
  return new GetIfsFileTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

beforeEach(() => vi.clearAllMocks());

describe('GetIfsFileTool', () => {
  it('returns file content and metadata', async () => {
    const data = parse(await invoke({ path: '/home/user/test.txt' }));
    expect(data.path).toBe('/home/user/test.txt');
    expect(data.content).toBe('hello world\n');
    expect(data.encoding).toBe('utf-8');
    expect(data.size).toBeGreaterThan(0);
  });

  it('throws on connection failure', async () => {
    getConnection.mockImplementationOnce(() => { throw new Error('Not connected'); });
    await expect(invoke({ path: '/tmp/file.txt' })).rejects.toThrow('Not connected');
  });
});
