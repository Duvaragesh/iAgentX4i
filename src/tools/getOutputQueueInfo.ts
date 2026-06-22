import * as vscode from 'vscode';
import { getConnection } from '../ibmiConnection.js';
import type { GetOutputQueueInfoInput, GetOutputQueueInfoOutput } from '../types.js';

export class GetOutputQueueInfoTool implements vscode.LanguageModelTool<GetOutputQueueInfoInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetOutputQueueInfoInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { library, outq, status, maxFiles } = options.input;
    const lib = library.toUpperCase();
    const outqName = outq.toUpperCase();
    const max = Math.min(maxFiles ?? 50, 200);

    const conditions: string[] = [
      `OUTPUT_QUEUE_LIBRARY_NAME = '${lib}'`,
      `OUTPUT_QUEUE_NAME = '${outqName}'`,
    ];

    if (status && status !== '*ALL') {
      const statusMap: Record<string, string> = {
        '*READY': 'READY',
        '*HELD': 'HELD',
        'READY': 'READY',
        'HELD': 'HELD',
      };
      const mapped = statusMap[status.toUpperCase()];
      if (mapped) {
        conditions.push(`STATUS = '${mapped}'`);
      }
    }

    const whereClause = ` WHERE ${conditions.join(' AND ')}`;

    const query = `SELECT SPOOLED_FILE_NAME, JOB_NAME, JOB_USER_NAME, ` +
      `SPOOLED_FILE_NUMBER, STATUS, TOTAL_PAGES, CREATE_TIMESTAMP ` +
      `FROM TABLE(QSYS2.SPOOLED_FILE_INFO())${whereClause} ` +
      `ORDER BY CREATE_TIMESTAMP DESC ` +
      `FETCH FIRST ${max} ROWS ONLY`;

    const rows = await getConnection().runSQL(query) as Record<string, unknown>[];

    const spoolFiles = rows.map(r => ({
      splfname: String(r['SPOOLED_FILE_NAME'] ?? ''),
      job: String(r['JOB_NAME'] ?? ''),
      jobUser: String(r['JOB_USER_NAME'] ?? ''),
      splfnbr: Number(r['SPOOLED_FILE_NUMBER'] ?? 0),
      status: r['STATUS'] != null ? String(r['STATUS']) : '',
      pages: r['TOTAL_PAGES'] != null ? Number(r['TOTAL_PAGES']) : null,
      createTime: r['CREATE_TIMESTAMP'] != null ? String(r['CREATE_TIMESTAMP']) : null,
    }));

    const result: GetOutputQueueInfoOutput = {
      library: lib,
      outq: outqName,
      spoolFiles,
      total: spoolFiles.length,
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetOutputQueueInfoInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    const { library, outq } = options.input;
    return { invocationMessage: `Getting spool files on output queue ${library}/${outq}` };
  }
}
