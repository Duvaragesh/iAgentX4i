import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListUserProfilesTool } from '../../../tools/listUserProfiles.js';
import { mockConnection, getConnection } from '../../__mocks__/ibmiConnection.js';


function invoke(input: Record<string, unknown>) {
  return new ListUserProfilesTool().invoke({ input } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const profileRow = {
  USER_NAME: 'MYUSER', STATUS: '*ENABLED', USER_CLASS_NAME: '*USER',
  PREVIOUS_SIGNON: '2024-06-01', DAYS_UNTIL_PASSWORD_EXPIRES: 30,
  NO_PASSWORD_INDICATOR: '*NO', TEXT_DESCRIPTION: 'Test user',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.runSQL.mockResolvedValue([profileRow]);
});

describe('ListUserProfilesTool', () => {
  it('returns user profile list', async () => {
    const data = parse(await invoke({}));
    expect(data.total).toBe(1);
    expect(data.profiles[0].userName).toBe('MYUSER');
    expect(data.profiles[0].userClass).toBe('*USER');
    expect(data.profiles[0].daysUntilPasswordExpires).toBe(30);
  });

  it('applies nameFilter with wildcard', async () => {
    await invoke({ nameFilter: 'MY*' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("USER_NAME LIKE 'MY%'");
  });

  it('filters by status when not *ALL', async () => {
    await invoke({ status: '*ENABLED' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain("STATUS = '*ENABLED'");
  });

  it('does not add status filter for *ALL', async () => {
    await invoke({ status: '*ALL' });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).not.toContain('STATUS =');
  });

  it('caps maxProfiles at 500', async () => {
    await invoke({ maxProfiles: 9999 });
    const sql: string = mockConnection.runSQL.mock.calls[0][0];
    expect(sql).toContain('FETCH FIRST 500 ROWS ONLY');
  });
});
