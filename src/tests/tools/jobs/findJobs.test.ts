import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FindJobsTool } from '../../../tools/findJobs.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new FindJobsTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const activeRow = {
  JOB_NAME_SHORT: 'MYJOB', JOB_USER: 'MYUSER', JOB_NUMBER: '123456',
  JOB_STATUS: 'RUN', JOB_ENTERED_SYSTEM_TIME: '2024-01-01', SUBSYSTEM: 'QINTER',
};
const endedRow = {
  FROM_JOB_NAME: 'MYJOB', FROM_JOB_USER: 'MYUSER', FROM_JOB_NUMBER: '123456',
  FROM_JOB: '123456/MYUSER/MYJOB', MESSAGE_TIMESTAMP: '2024-01-01T10:00:00',
  MESSAGE_TEXT: 'Job MYJOB end code 0.',
};

beforeEach(() => vi.clearAllMocks());

describe('FindJobsTool — ACTIVE', () => {
  it('returns active jobs', async () => {
    mockConnection.runSQL.mockResolvedValue([activeRow]);
    const data = parse(await invoke({ jobname: 'MYJOB', status: 'ACTIVE' }));
    expect(data.total).toBe(1);
    expect(data.jobs[0].status).toBe('ACTIVE');
    expect(data.jobs[0].job_name).toBe('MYJOB');
  });

  it('converts trailing * to SQL LIKE pattern', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    await invoke({ jobname: 'MY*', status: 'ACTIVE' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("'MY%'");
  });
});

describe('FindJobsTool — OUTQ (ended)', () => {
  it('returns ended jobs', async () => {
    mockConnection.runSQL.mockResolvedValue([endedRow]);
    const data = parse(await invoke({ jobname: 'MYJOB', status: 'OUTQ' }));
    expect(data.total).toBe(1);
    expect(data.jobs[0].status).toBe('ENDED');
    expect(data.jobs[0].completion_code).toBe(0);
  });
});

describe('FindJobsTool — ALL', () => {
  it('queries both active and ended', async () => {
    mockConnection.runSQL
      .mockResolvedValueOnce([activeRow])
      .mockResolvedValueOnce([endedRow]);
    const data = parse(await invoke({ jobname: 'MYJOB', status: 'ALL' }));
    expect(data.total).toBe(2);
    expect(mockConnection.runSQL).toHaveBeenCalledTimes(2);
  });
});
