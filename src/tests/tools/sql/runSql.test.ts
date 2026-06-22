import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunSqlTool } from '../../../tools/runSql.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new RunSqlTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const sampleRows = [
  { NAME: 'Alice', AGE: 30 },
  { NAME: 'Bob', AGE: 25 },
  { NAME: 'Carol', AGE: 28 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue(sampleRows);
});

describe('RunSqlTool — SELECT validation', () => {
  it('allows SELECT statements', async () => {
    const data = parse(await invoke({ query: 'SELECT * FROM MYLIB.MYFILE' }));
    expect(data.rowCount).toBe(3);
  });

  it('allows WITH (CTE)', async () => {
    const data = parse(await invoke({ query: 'WITH CTE AS (SELECT 1) SELECT * FROM CTE' }));
    expect(data.rowCount).toBe(3);
  });

  it('allows VALUES', async () => {
    const data = parse(await invoke({ query: 'VALUES (1, 2, 3)' }));
    expect(data.rowCount).toBe(3);
  });

  it.each(['INSERT INTO t VALUES (1)', 'UPDATE t SET x=1', 'DELETE FROM t', 'DROP TABLE t', 'CREATE TABLE t(x INT)'])(
    'blocks DML/DDL: %s',
    async (query) => {
      await expect(invoke({ query })).rejects.toThrow('Only SELECT statements are allowed');
    }
  );
});

describe('RunSqlTool — pagination', () => {
  it('returns rows up to maxRows', async () => {
    const data = parse(await invoke({ query: 'SELECT 1', maxRows: 2 }));
    expect(data.rowCount).toBe(2);
    expect(data.hasMore).toBe(true);
  });

  it('reports hasMore=false when rows fit in maxRows', async () => {
    const data = parse(await invoke({ query: 'SELECT 1', maxRows: 10 }));
    expect(data.hasMore).toBe(false);
    expect(data.rowCount).toBe(3);
  });

  it('applies offset correctly', async () => {
    const data = parse(await invoke({ query: 'SELECT 1', offset: 2 }));
    expect(data.offset).toBe(2);
    expect(data.rowCount).toBe(1);
  });

  it('caps maxRows at 1000', async () => {
    const bigRows = Array.from({ length: 1001 }, (_, i) => ({ ID: i }));
    mockConnection.runSQL.mockResolvedValue(bigRows);
    const data = parse(await invoke({ query: 'SELECT 1', maxRows: 5000 }));
    expect(data.rowCount).toBe(1000);
  });
});

describe('RunSqlTool — V7R6+ TABLE() auto-retry', () => {
  it('retries with TABLE() wrapper on SQL0104 error', async () => {
    mockConnection.runSQL
      .mockRejectedValueOnce(new Error('SQL0104: Token FROM was not valid'))
      .mockResolvedValueOnce([{ X: 1 }]);

    const data = parse(await invoke({ query: 'SELECT X FROM QSYS2.ACTIVE_JOB_INFO()' }));
    expect(data.rowCount).toBe(1);
    expect(mockConnection.runSQL).toHaveBeenCalledTimes(2);
    const rewritten: string = mockConnection.runSQL.mock.calls[1][0];
    expect(rewritten).toContain('FROM TABLE(QSYS2.ACTIVE_JOB_INFO(');
  });

  it('rethrows SQL0104 when no table function to wrap', async () => {
    mockConnection.runSQL.mockRejectedValue(new Error('SQL0104 with no rewrite possible'));
    await expect(invoke({ query: 'SELECT 1 FROM MYLIB.FILE' })).rejects.toThrow('SQL0104');
  });
});

describe('RunSqlTool — disconnected', () => {
  it('throws connection error', async () => {
    getConnection.mockImplementationOnce(() => { throw new Error('No active IBM i connection'); });
    await expect(invoke({ query: 'SELECT 1' })).rejects.toThrow('No active IBM i connection');
  });
});
