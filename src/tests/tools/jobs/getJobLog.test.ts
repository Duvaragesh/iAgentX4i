import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetJobLogTool } from '../../../tools/getJobLog.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';

vi.mock('../../../utils/ifsRead.js', () => ({
  readIfsAsText: vi.fn().mockResolvedValue({ text: 'spool content line 1\nspool content line 2' }),
}));

function invoke(input: Record<string, unknown>) {
  return new GetJobLogTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const msgRow = {
  MESSAGE_ID: 'CPF0001', MESSAGE_TEXT: 'Error occurred',
  MESSAGE_SECOND_LEVEL_TEXT: 'See cause', SEVERITY: 30, MESSAGE_TYPE: 'DIAGNOSTIC',
};

beforeEach(() => vi.clearAllMocks());

describe('GetJobLogTool — happy path', () => {
  it('returns messages from JOBLOG_INFO', async () => {
    mockConnection.runSQL.mockResolvedValue([msgRow]);
    const data = parse(await invoke({}));
    expect(data.total).toBe(1);
    expect(data.messages[0].id).toBe('CPF0001');
    expect(data.messages[0].severity).toBe(30);
  });

  it('filters by minSeverity', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    await invoke({ minSeverity: 30 });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain('SEVERITY >= 30');
  });

  it('filters by messageType', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    await invoke({ messageType: 'ESCAPE' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("MESSAGE_TYPE = 'ESCAPE'");
  });

  it('includes timestamp column when requested', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    await invoke({ includeTimestamp: true });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain('MESSAGE_TIMESTAMP');
  });
});

describe('GetJobLogTool — spool fallback for ended job', () => {
  it('copies spool to IFS and reads content on JOBLOG_INFO failure', async () => {
    mockConnection.runSQL.mockRejectedValue(new Error('Job has ended'));
    mockConnection.runCommand.mockResolvedValue({ code: 0 });

    const data = parse(await invoke({ job: '123456/MYUSER/MYJOB' }));
    expect(data.messages[0].id).toBe('SPOOL');
    expect(typeof data.messages[0].text).toBe('string');
  });

  it('returns unavailable message when CPYSPLF fails', async () => {
    mockConnection.runSQL.mockRejectedValue(new Error('Job has ended'));
    mockConnection.runCommand.mockResolvedValue({ code: 10, stderr: 'CPF3307' });

    const data = parse(await invoke({ job: '123456/MYUSER/MYJOB' }));
    expect(data.messages[0].text).toContain('no longer available');
  });
});

describe('GetJobLogTool — validation', () => {
  it('throws for malformed job format', async () => {
    await expect(invoke({ job: 'BADJOB' })).rejects.toThrow('NUMBER/USER/NAME');
  });
});
