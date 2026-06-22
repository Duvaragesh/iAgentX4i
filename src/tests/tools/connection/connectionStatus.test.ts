import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionStatusTool } from '../../../tools/connectionStatus.js';
import * as vscode from '../../__mocks__/vscode.js';


function invoke() {
  return new ConnectionStatusTool().invoke({ input: {} } as any, {} as any);
}
function parse(r: any) { return JSON.parse(r.getText()); }

const makeConn = (overrides = {}) => ({
  runSQL: vi.fn().mockResolvedValue([{ OS_RELEASE: 'V7R5M0' }]),
  currentHost: 'ibmi.host',
  currentUser: 'TESTUSER',
  currentPort: 23,
  currentConnectionName: 'MY_CONN',
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe('ConnectionStatusTool — extension not present', () => {
  it('returns connected=false', async () => {
    (vscode.extensions.getExtension as any).mockReturnValue(undefined);
    const data = parse(await invoke());
    expect(data.connected).toBe(false);
  });
});

describe('ConnectionStatusTool — extension inactive', () => {
  it('returns connected=false', async () => {
    (vscode.extensions.getExtension as any).mockReturnValue({ isActive: false });
    const data = parse(await invoke());
    expect(data.connected).toBe(false);
  });
});

describe('ConnectionStatusTool — extension active but no connection', () => {
  it('returns connected=false', async () => {
    (vscode.extensions.getExtension as any).mockReturnValue({
      isActive: true,
      exports: { instance: { getConnection: () => null } },
    });
    const data = parse(await invoke());
    expect(data.connected).toBe(false);
  });
});

describe('ConnectionStatusTool — connected', () => {
  it('returns connected=true with host details', async () => {
    const conn = makeConn();
    (vscode.extensions.getExtension as any).mockReturnValue({
      isActive: true,
      exports: { instance: { getConnection: () => conn } },
    });
    const data = parse(await invoke());
    expect(data.connected).toBe(true);
    expect(data.host).toBe('ibmi.host');
    expect(data.user).toBe('TESTUSER');
    expect(data.osVersion).toBe('V7R5M0');
  });

  it('returns connected=true without osVersion when SQL fails', async () => {
    const conn = makeConn({ runSQL: vi.fn().mockRejectedValue(new Error('unsupported')) });
    (vscode.extensions.getExtension as any).mockReturnValue({
      isActive: true,
      exports: { instance: { getConnection: () => conn } },
    });
    const data = parse(await invoke());
    expect(data.connected).toBe(true);
    expect(data.osVersion).toBeUndefined();
  });
});
