import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetFileFieldsTool } from '../../../tools/getFileFields.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new GetFileFieldsTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const sampleFields = [
  {
    COLUMN_NAME: 'CUST_ID', DATA_TYPE: 'DECIMAL', LENGTH: 9,
    NUMERIC_PRECISION: 9, NUMERIC_SCALE: 0, IS_NULLABLE: 'N',
    COLUMN_DEFAULT: null, COLUMN_TEXT: 'Customer ID', ORDINAL_POSITION: 1,
  },
  {
    COLUMN_NAME: 'CUST_NAME', DATA_TYPE: 'CHAR', LENGTH: 50,
    NUMERIC_PRECISION: null, NUMERIC_SCALE: null, IS_NULLABLE: 'Y',
    COLUMN_DEFAULT: null, COLUMN_TEXT: 'Customer Name', ORDINAL_POSITION: 2,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue(sampleFields);
});

describe('GetFileFieldsTool', () => {
  it('returns field list with correct shape', async () => {
    const data = parse(await invoke({ library: 'MYLIB', file: 'CUSTFILE' }));
    expect(data.library).toBe('MYLIB');
    expect(data.file).toBe('CUSTFILE');
    expect(data.total).toBe(2);
    expect(data.fields[0].name).toBe('CUST_ID');
    expect(data.fields[0].nullable).toBe(false);
    expect(data.fields[1].nullable).toBe(true);
  });

  it('uses castUtf8 for COLUMN_TEXT in SQL', async () => {
    await invoke({ library: 'MYLIB', file: 'CUSTFILE' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain('CCSID 1208');
  });

  it('returns empty when no fields found', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    const data = parse(await invoke({ library: 'MYLIB', file: 'EMPTY' }));
    expect(data.total).toBe(0);
    expect(data.fields).toHaveLength(0);
  });
});
