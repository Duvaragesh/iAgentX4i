import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDataAreaTool } from '../../../tools/getDataArea.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new GetDataAreaTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue([{
    DATA_AREA_VALUE: 'HELLO', DATA_AREA_TYPE: 'CHAR', DATA_AREA_LENGTH: 10, DATA_AREA_TEXT: 'Test area',
  }]);
});

describe('GetDataAreaTool', () => {
  it('returns data area value', async () => {
    const data = parse(await invoke({ library: 'MYLIB', name: 'MYDA' }));
    expect(data.value).toBe('HELLO');
    expect(data.dataType).toBe('CHAR');
    expect(data.length).toBe(10);
  });

  it('throws when data area not found', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    await expect(invoke({ library: 'MYLIB', name: 'GONE' })).rejects.toThrow('not found');
  });
});
