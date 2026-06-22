import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListSpoolFilesTool } from '../../../tools/listSpoolFiles.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new ListSpoolFilesTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const spoolRow = {
  SPOOLED_FILE_NAME: 'QSYSPRT', SPOOLED_FILE_NUMBER: 1,
  JOB_NAME: '123456/MYUSER/MYJOB', STATUS: 'RDY',
  TOTAL_PAGES: 5, CREATE_TIMESTAMP: '2024-01-01T10:00:00',
  OUTPUT_QUEUE_NAME: 'QPRINT', OUTPUT_QUEUE_LIBRARY_NAME: 'QGPL',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue([spoolRow]);
});

describe('ListSpoolFilesTool', () => {
  it('returns spool file list', async () => {
    const data = parse(await invoke({}));
    expect(data.total).toBe(1);
    expect(data.spoolFiles[0].splfname).toBe('QSYSPRT');
    expect(data.spoolFiles[0].pages).toBe(5);
    expect(data.spoolFiles[0].outputQueue).toBe('QPRINT');
  });

  it('queries by specific job when provided', async () => {
    await invoke({ job: '123456/MYUSER/MYJOB' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("JOB_NAME => '123456/MYUSER/MYJOB'");
  });

  it('throws for invalid job format', async () => {
    await expect(invoke({ job: 'BADJOB' })).rejects.toThrow('NUMBER/USER/NAME');
  });

  it('filters by username when provided', async () => {
    await invoke({ username: 'MYUSER' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("JOB_USER_NAME = 'MYUSER'");
  });

  it('caps maxFiles at 200', async () => {
    await invoke({ maxFiles: 9999 });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain('FETCH FIRST 200 ROWS ONLY');
  });
});
