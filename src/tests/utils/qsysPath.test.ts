import { describe, it, expect } from 'vitest';
import { getQSYSObjectPath } from '../../utils/qsysPath.js';

describe('getQSYSObjectPath', () => {
  it('builds basic object path', () => {
    expect(getQSYSObjectPath('MYLIB', 'MYPGM', 'PGM')).toBe('/QSYS.LIB/MYLIB.LIB/MYPGM.PGM');
  });

  it('uppercases all parts', () => {
    expect(getQSYSObjectPath('mylib', 'myfile', 'file')).toBe('/QSYS.LIB/MYLIB.LIB/MYFILE.FILE');
  });

  it('includes member when provided', () => {
    expect(getQSYSObjectPath('MYLIB', 'QRPGLE', 'FILE', 'HELLO')).toBe(
      '/QSYS.LIB/MYLIB.LIB/QRPGLE.FILE/HELLO.MBR'
    );
  });

  it('includes IASP prefix when provided', () => {
    expect(getQSYSObjectPath('MYLIB', 'MYPGM', 'PGM', undefined, 'MYASP')).toBe(
      '/QSYS.LIB/MYASP.LIB/MYLIB.LIB/MYPGM.PGM'
    );
  });
});
