import * as vscode from 'vscode';
import { getConnection } from '../ibmiConnection.js';
import type { SearchSourceMembersInput, SearchSourceMembersOutput } from '../types.js';

export class SearchSourceMembersTool implements vscode.LanguageModelTool<SearchSourceMembersInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SearchSourceMembersInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { library, spf, searchTerm, memberFilter, maxResults } = options.input;
    const lib = library.toUpperCase();
    const file = spf.toUpperCase();
    const term = searchTerm.replace(/'/g, "''");
    const max = Math.min(maxResults ?? 100, 500);

    const memberArg = memberFilter ? `, MEMBER => '${memberFilter.toUpperCase().replace(/\*/g, '%')}'` : '';

    // SYSTOOLS.SEARCH_SOURCE is available on V7R3+
    const query = `SELECT SOURCE_FILE_LIBRARY, SOURCE_FILE, SOURCE_MEMBER, ` +
      `SOURCE_SEQ_NBR, CAST(SOURCE_DATA AS VARCHAR(200) CCSID 1208) AS SOURCE_DATA ` +
      `FROM TABLE(SYSTOOLS.SEARCH_SOURCE(` +
      `SOURCE_FILE_LIBRARY => '${lib}', ` +
      `SOURCE_FILE => '${file}', ` +
      `SEARCH_ARGUMENT => '${term}'` +
      `${memberArg})) ` +
      `FETCH FIRST ${max} ROWS ONLY`;

    const conn = getConnection();
    let rows: Record<string, unknown>[];

    try {
      rows = await conn.runSQL(query) as Record<string, unknown>[];
    } catch (e) {
      // Fallback: iterate members via IFS_READ on QSYS.LIB paths
      rows = await this.fallbackSearch(conn, lib, file, term, memberFilter, max);
    }

    const hits = rows.map(r => ({
      library: String(r['SOURCE_FILE_LIBRARY'] ?? lib),
      spf: String(r['SOURCE_FILE'] ?? file),
      member: String(r['SOURCE_MEMBER'] ?? ''),
      lineNumber: r['SOURCE_SEQ_NBR'] != null ? Number(r['SOURCE_SEQ_NBR']) : null,
      lineText: r['SOURCE_DATA'] != null ? String(r['SOURCE_DATA']).trim() : '',
    }));

    const result: SearchSourceMembersOutput = {
      library: lib,
      spf: file,
      searchTerm,
      hits,
      total: hits.length,
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }

  private async fallbackSearch(
    conn: ReturnType<typeof getConnection>,
    lib: string,
    file: string,
    term: string,
    memberFilter: string | undefined,
    max: number
  ): Promise<Record<string, unknown>[]> {
    const memberClause = memberFilter
      ? ` AND SOURCE_MEMBER LIKE '${memberFilter.toUpperCase().replace(/\*/g, '%')}'`
      : '';
    const memberListQ = `SELECT SOURCE_MEMBER FROM TABLE(QSYS2.SYSPARTITIONSTAT) ` +
      `WHERE SOURCE_FILE_LIBRARY = '${lib}' AND SOURCE_FILE = '${file}'${memberClause} ` +
      `FETCH FIRST 200 ROWS ONLY`;

    let members: Record<string, unknown>[];
    try {
      members = await conn.runSQL(memberListQ) as Record<string, unknown>[];
    } catch {
      return [];
    }

    const hits: Record<string, unknown>[] = [];
    for (const m of members) {
      if (hits.length >= max) { break; }
      const mbr = String(m['SOURCE_MEMBER'] ?? '');
      const ifsPath = `/QSYS.LIB/${lib}.LIB/${file}.FILE/${mbr}.MBR`;
      const lineQuery = `SELECT RRN(T) AS SOURCE_SEQ_NBR, ` +
        `CAST(T.SRCDTA AS VARCHAR(200) CCSID 1208) AS SOURCE_DATA ` +
        `FROM ${lib}.${file} T WHERE T.SRCMBR = '${mbr}' ` +
        `AND UPPER(CAST(T.SRCDTA AS VARCHAR(200) CCSID 1208)) LIKE UPPER('%${term}%') ` +
        `FETCH FIRST 10 ROWS ONLY`;
      try {
        const lineRows = await conn.runSQL(lineQuery) as Record<string, unknown>[];
        for (const lr of lineRows) {
          hits.push({
            SOURCE_FILE_LIBRARY: lib,
            SOURCE_FILE: file,
            SOURCE_MEMBER: mbr,
            SOURCE_SEQ_NBR: lr['SOURCE_SEQ_NBR'],
            SOURCE_DATA: lr['SOURCE_DATA'],
          });
          if (hits.length >= max) { break; }
        }
      } catch {
        // skip members that can't be read
      }
    }
    return hits;
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<SearchSourceMembersInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    const { library, spf, searchTerm } = options.input;
    return { invocationMessage: `Searching "${searchTerm}" in ${library}/${spf}` };
  }
}
