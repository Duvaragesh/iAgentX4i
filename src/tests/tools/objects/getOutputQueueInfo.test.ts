import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetOutputQueueInfoTool } from '../../../tools/getOutputQueueInfo.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new GetOutputQueueInfoTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const spoolRow = {
  SPOOLED_FILE_NAME: 'QSYSPRT', JOB_NAME: '123456/MYUSER/MYJOB',
  JOB_USER_NAME: 'MYUSER', SPOOLED_FILE_NUMBER: 1,
  STATUS: 'RDY', TOTAL_PAGES: 3, CREATE_TIMESTAMP: '2024-01-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue([spoolRow]);
});

describe('GetOutputQueueInfoTool', () => {
  it('returns spool files on the output queue', async () => {
    const data = parse(await invoke({ library: 'QGPL', outq: 'QPRINT' }));
    expect(data.library).toBe('QGPL');
    expect(data.outq).toBe('QPRINT');
    expect(data.total).toBe(1);
    expect(data.spoolFiles[0].splfname).toBe('QSYSPRT');
  });

  it('filters by READY status', async () => {
    await invoke({ library: 'QGPL', outq: 'QPRINT', status: '*READY' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("STATUS = 'READY'");
  });

  it('does not add status filter for *ALL', async () => {
    await invoke({ library: 'QGPL', outq: 'QPRINT', status: '*ALL' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).not.toContain("STATUS = ");
  });

  it('caps maxFiles at 200', async () => {
    await invoke({ library: 'QGPL', outq: 'QPRINT', maxFiles: 9999 });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain('FETCH FIRST 200 ROWS ONLY');
  });
});
