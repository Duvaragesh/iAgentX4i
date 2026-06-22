import { vi } from 'vitest';

export const mockContent = {
  getMemberList: vi.fn(),
  downloadMemberContent: vi.fn(),
  uploadMemberContent: vi.fn(),
  getObjectList: vi.fn(),
  getFileList: vi.fn(),
  writeStreamfileRaw: vi.fn(),
};

export const mockConnection = {
  runSQL: vi.fn(),
  runCommand: vi.fn(),
  getContent: vi.fn(() => mockContent),
  currentHost: 'test.ibmi.host',
  currentUser: 'TESTUSER',
  currentPort: 23,
  currentConnectionName: 'TEST_CONN',
};

export const getConnection = vi.fn(() => mockConnection);
