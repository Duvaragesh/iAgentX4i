import type { IBMiConnection } from '../ibmiConnection.js';

export interface IfsTextResult {
  text: string;
  /** How the content was decoded: ccsid-NNN, base64-binary, utf-8-fallback */
  encoding: string;
}

/**
 * Read an IFS file as text, handling EBCDIC CCSIDs by letting DB2 transcode
 * via QSYS2.IFS_READ (TABLE() wrapper required on V7R6+).
 * Falls back to raw UTF-8 download if the SQL path is unavailable.
 * CCSID 65535 (binary) is returned as base64 with encoding='base64-binary'.
 */
export async function readIfsAsText(
  connection: NonNullable<IBMiConnection>,
  path: string,
): Promise<IfsTextResult> {
  const escapedPath = path.replace(/'/g, "''");

  // Step 1: look up the file's CCSID from IFS metadata
  let ccsid: number | null = null;
  try {
    const rows = await connection.runSQL(
      `SELECT CCSID FROM TABLE(QSYS2.IFS_OBJECT_STATISTICS(PATH_NAME => '${escapedPath}', SUBTREE_DIRECTORIES => 'NO'))`
    ) as Record<string, unknown>[];
    if (rows.length > 0 && rows[0]['CCSID'] != null) {
      ccsid = Number(rows[0]['CCSID']);
    }
  } catch {
    // Metadata unavailable — proceed to text read anyway
  }

  // Step 2: binary file — return base64 so callers know it's raw
  if (ccsid === 65535) {
    const buf = await connection.getContent().downloadStreamfileRaw(path);
    return { text: buf.toString('base64'), encoding: 'base64-binary' };
  }

  // Step 3: let DB2 transcode via QSYS2.IFS_READ (handles all EBCDIC CCSIDs)
  // TABLE() wrapper is required on V7R6+
  try {
    const rows = await connection.runSQL(
      `SELECT CAST(LINE AS VARCHAR(32000 CCSID 1208)) AS LINE FROM TABLE(QSYS2.IFS_READ(PATH_NAME => '${escapedPath}', LINE_TERMINATOR => '*CRLF'))`
    ) as Record<string, unknown>[];
    const text = rows.map(r => String(r['LINE'] ?? '')).join('\n');
    return { text, encoding: `ccsid-${ccsid ?? 'unknown'}` };
  } catch {
    // Step 4: last resort — raw download, assume UTF-8
    const buf = await connection.getContent().downloadStreamfileRaw(path);
    return { text: buf.toString('utf-8'), encoding: 'utf-8-fallback' };
  }
}
