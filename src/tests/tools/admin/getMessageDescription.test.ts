import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetMessageDescriptionTool } from '../../../tools/getMessageDescription.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new GetMessageDescriptionTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const msgRow = {
  MESSAGE_ID: 'CPF0001', MESSAGE_TEXT: 'Error occurred.',
  MESSAGE_SECOND_LEVEL_TEXT: 'See the job log for more information.', SEVERITY: 40,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue([msgRow]);
});

describe('GetMessageDescriptionTool', () => {
  it('returns message description when found', async () => {
    const data = parse(await invoke({ library: 'QSYS', msgf: 'QCPFMSG', messageId: 'CPF0001' }));
    expect(data.found).toBe(true);
    expect(data.messageId).toBe('CPF0001');
    expect(data.severity).toBe(40);
    expect(data.messageText).toBe('Error occurred.');
  });

  it('returns found=false when message not in file', async () => {
    mockConnection.runSQL.mockResolvedValue([]);
    const data = parse(await invoke({ library: 'QSYS', msgf: 'QCPFMSG', messageId: 'ZZZNONE' }));
    expect(data.found).toBe(false);
    expect(data.messageId).toBe('ZZZNONE');
  });

  it('uppercases all inputs', async () => {
    await invoke({ library: 'qsys', msgf: 'qcpfmsg', messageId: 'cpf0001' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("MESSAGE_FILE_LIBRARY => 'QSYS'");
    expect(sql).toContain("MESSAGE_FILE => 'QCPFMSG'");
    expect(sql).toContain("MESSAGE_ID = 'CPF0001'");
  });
});
