import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSpoolFileTool } from '../../../tools/getSpoolFile.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';

vi.mock('../../../utils/ifsRead.js', () => ({
  readIfsAsText: vi.fn().mockResolvedValue({ text: 'line1\nline2\nline3\nline4\nline5' }),
}));

function invoke(input: Record<string, unknown>) {
  return new GetSpoolFileTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue([{ SPOOLED_FILE_NUMBER: 1 }]);
  mockConnection.runCommand.mockResolvedValue({ code: 0 });
});

describe('GetSpoolFileTool', () => {
  it('returns spool file content', async () => {
    const data = parse(await invoke({ job: '123456/MYUSER/MYJOB', splfname: 'QSYSPRT' }));
    expect(data.job).toBe('123456/MYUSER/MYJOB');
    expect(data.splfname).toBe('QSYSPRT');
    expect(typeof data.content).toBe('string');
  });

  it('applies startLine and lineCount', async () => {
    const data = parse(await invoke({ job: '123456/MYUSER/MYJOB', splfname: 'QSYSPRT', startLine: 2, lineCount: 2 }));
    expect(data.startLine).toBe(2);
    expect(data.returnedLines).toBe(2);
    expect(data.content).toBe('line2\nline3');
  });

  it('throws for invalid job format', async () => {
    await expect(invoke({ job: 'BADJOB', splfname: 'QSYSPRT' })).rejects.toThrow('NUMBER/USER/NAME');
  });

  it('throws when spool file not found', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    await expect(invoke({ job: '123456/MYUSER/MYJOB', splfname: 'NOSPOOL' })).rejects.toThrow('No spool file');
  });

  it('throws when job not found from SQL error', async () => {
    mockConnection.runSQL.mockRejectedValue(new Error('CPF3307 job not found'));
    await expect(invoke({ job: '000000/NOBODY/GONE', splfname: 'QSYSPRT' })).rejects.toThrow('not found');
  });

  it('throws on authorization error from CPYSPLF', async () => {
    mockConnection.runCommand.mockResolvedValue({ code: 10, stderr: 'CPF2189 not authorized' });
    await expect(invoke({ job: '123456/MYUSER/MYJOB', splfname: 'QSYSPRT' })).rejects.toThrow('Not authorised');
  });
});
