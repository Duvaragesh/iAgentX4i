import * as vscode from 'vscode';
import { getConnection } from '../ibmiConnection.js';
import type { GetIfsFileInput, GetIfsFileOutput } from '../types.js';
import { readIfsAsText } from '../utils/ifsRead.js';

export class GetIfsFileTool implements vscode.LanguageModelTool<GetIfsFileInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetIfsFileInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { path } = options.input;
    const connection = getConnection();

    const { text, encoding } = await readIfsAsText(connection, path);

    const result: GetIfsFileOutput = { path, content: text, size: Buffer.byteLength(text, 'utf-8'), encoding };
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetIfsFileInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    return { invocationMessage: `Reading IFS file ${options.input.path}` };
  }
}
