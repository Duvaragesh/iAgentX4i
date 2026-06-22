import * as vscode from 'vscode';
import { getConnection } from '../ibmiConnection.js';
import { castUtf8 } from '../utils/ccsidCast.js';
import type { GetMessageDescriptionInput, GetMessageDescriptionOutput } from '../types.js';

export class GetMessageDescriptionTool implements vscode.LanguageModelTool<GetMessageDescriptionInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetMessageDescriptionInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { library, msgf, messageId } = options.input;
    const lib = library.toUpperCase();
    const msgFile = msgf.toUpperCase();
    const msgId = messageId.toUpperCase();

    const query = `SELECT MESSAGE_ID, ` +
      `${castUtf8('MESSAGE_TEXT', 512)} AS MESSAGE_TEXT, ` +
      `${castUtf8('MESSAGE_SECOND_LEVEL_TEXT', 2000)} AS MESSAGE_SECOND_LEVEL_TEXT, ` +
      `SEVERITY ` +
      `FROM TABLE(QSYS2.MESSAGE_FILE_DATA(` +
      `MESSAGE_FILE_LIBRARY => '${lib}', ` +
      `MESSAGE_FILE => '${msgFile}')) ` +
      `WHERE MESSAGE_ID = '${msgId}' ` +
      `FETCH FIRST 1 ROW ONLY`;

    const rows = await getConnection().runSQL(query) as Record<string, unknown>[];

    let result: GetMessageDescriptionOutput;
    if (rows.length === 0) {
      result = { found: false, library: lib, msgf: msgFile, messageId: msgId };
    } else {
      const r = rows[0];
      result = {
        found: true,
        library: lib,
        msgf: msgFile,
        messageId: String(r['MESSAGE_ID'] ?? msgId),
        messageText: r['MESSAGE_TEXT'] != null ? String(r['MESSAGE_TEXT']) : '',
        secondLevelText: r['MESSAGE_SECOND_LEVEL_TEXT'] != null ? String(r['MESSAGE_SECOND_LEVEL_TEXT']) : '',
        severity: r['SEVERITY'] != null ? Number(r['SEVERITY']) : null,
      };
    }

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetMessageDescriptionInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    const { library, msgf, messageId } = options.input;
    return { invocationMessage: `Looking up message ${messageId} in ${library}/${msgf}` };
  }
}
