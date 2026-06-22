import { describe, it, expect } from 'vitest';
import { castUtf8 } from '../../utils/ccsidCast.js';

describe('castUtf8', () => {
  it('wraps column in CAST to VARCHAR CCSID 1208', () => {
    expect(castUtf8('COLUMN_TEXT')).toBe('CAST(COLUMN_TEXT AS VARCHAR(50) CCSID 1208)');
  });

  it('respects custom maxLen', () => {
    expect(castUtf8('MY_COL', 200)).toBe('CAST(MY_COL AS VARCHAR(200) CCSID 1208)');
  });

  it('wraps expressions with spaces', () => {
    expect(castUtf8("COALESCE(T, '')", 100)).toBe("CAST(COALESCE(T, '') AS VARCHAR(100) CCSID 1208)");
  });
});
