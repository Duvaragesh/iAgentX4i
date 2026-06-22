import * as vscode from 'vscode';
import { getConnection } from '../ibmiConnection.js';
import type { SearchIfsInput, SearchIfsOutput } from '../types.js';

export class SearchIfsTool implements vscode.LanguageModelTool<SearchIfsInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SearchIfsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { path: rootPath, searchTerm, filePattern, caseSensitive, maxFiles } = options.input;
    const maxF = Math.min(maxFiles ?? 50, 200);
    const term = searchTerm.replace(/'/g, "''");
    const caseInsensitive = !caseSensitive;

    // Enumerate text files under the root path recursively
    const enumQuery = `SELECT PATH_NAME, DATA_SIZE FROM TABLE(QSYS2.IFS_OBJECT_STATISTICS(` +
      `PATH_NAME => '${rootPath.replace(/'/g, "''")}', ` +
      `SUBTREE_DIRECTORIES => 'YES')) ` +
      `WHERE OBJECT_TYPE = '*STMF' AND CCSID <> 65535 ` +
      `ORDER BY PATH_NAME FETCH FIRST 1000 ROWS ONLY`;

    const conn = getConnection();
    const fileRows = await conn.runSQL(enumQuery) as Record<string, unknown>[];

    // Apply optional filename glob filter (convert * to SQL LIKE %)
    const filteredFiles = filePattern
      ? fileRows.filter(r => {
          const fname = String(r['PATH_NAME'] ?? '').split('/').pop() ?? '';
          const likePattern = filePattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
          return new RegExp(`^${likePattern}$`, caseInsensitive ? 'i' : '').test(fname);
        })
      : fileRows;

    const matchingFiles: Array<{ path: string; matchCount: number; sampleLines: string[] }> = [];

    for (const fileRow of filteredFiles) {
      if (matchingFiles.length >= maxF) { break; }
      const filePath = String(fileRow['PATH_NAME'] ?? '');

      const searchQuery = caseInsensitive
        ? `SELECT CAST(LINE AS VARCHAR(200) CCSID 1208) AS LINE ` +
          `FROM TABLE(QSYS2.IFS_READ(PATH_NAME => '${filePath.replace(/'/g, "''")}', IGNORE_ERRORS => 'YES')) ` +
          `WHERE UPPER(CAST(LINE AS VARCHAR(200) CCSID 1208)) LIKE UPPER('%${term}%') ` +
          `FETCH FIRST 5 ROWS ONLY`
        : `SELECT CAST(LINE AS VARCHAR(200) CCSID 1208) AS LINE ` +
          `FROM TABLE(QSYS2.IFS_READ(PATH_NAME => '${filePath.replace(/'/g, "''")}', IGNORE_ERRORS => 'YES')) ` +
          `WHERE CAST(LINE AS VARCHAR(200) CCSID 1208) LIKE '%${term}%' ` +
          `FETCH FIRST 5 ROWS ONLY`;

      try {
        const lineRows = await conn.runSQL(searchQuery) as Record<string, unknown>[];
        if (lineRows.length > 0) {
          matchingFiles.push({
            path: filePath,
            matchCount: lineRows.length,
            sampleLines: lineRows.map(r => String(r['LINE'] ?? '').trim()),
          });
        }
      } catch {
        // skip files that can't be read (binary, locked, etc.)
      }
    }

    const result: SearchIfsOutput = {
      rootPath,
      searchTerm,
      matchingFiles,
      total: matchingFiles.length,
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<SearchIfsInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    const { path: rootPath, searchTerm } = options.input;
    return { invocationMessage: `Searching IFS for "${searchTerm}" under ${rootPath}` };
  }
}
