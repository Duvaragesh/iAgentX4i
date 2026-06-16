import * as vscode from 'vscode';
import { getConnection } from '../ibmiConnection.js';
import type { RunClCommandInput, RunClCommandOutput } from '../types.js';

// Read-only CL command prefixes that are allowed by default
const ALLOWED_PREFIXES = [
  'DSP', 'LST', 'WRK', 'CHK', 'PRT', 'DMP', 'RTV', 'QRY',
];

function isAllowed(command: string): boolean {
  const verb = command.trim().toUpperCase().split(/\s+/)[0];
  return ALLOWED_PREFIXES.some(p => verb.startsWith(p));
}

// CPYSPLF is allowed only when writing to TOFILE(*TOSTMF) with a path under /tmp/
function validateCpySplf(command: string): boolean {
  const tofileMatch = /TOFILE\s*\(\s*\*TOSTMF\s*\)/i.test(command);
  const tostmfMatch = /TOSTMF\s*\(\s*'(\/[^']+)'\s*\)/i.exec(command);
  return tofileMatch && tostmfMatch !== null && tostmfMatch[1].startsWith('/tmp/');
}

export class RunClCommandTool implements vscode.LanguageModelTool<RunClCommandInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<RunClCommandInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { command } = options.input;
    const verb = command.trim().toUpperCase().split(/\s+/)[0];

    if (verb === 'CPYSPLF') {
      if (!validateCpySplf(command)) {
        throw new Error('CPYSPLF is only permitted with TOFILE(*TOSTMF) and a destination path under /tmp/');
      }
    } else if (!isAllowed(command)) {
      throw new Error(
        `Command not allowed: only read-only commands starting with ${ALLOWED_PREFIXES.join(', ')} are permitted.`
      );
    }

    const connection = getConnection();
    const result = await connection.runCommand({ command, environment: 'ile' });

    const output: RunClCommandOutput = {
      output: result.stdout ?? '',
      stderr: result.stderr ?? undefined,
      exitCode: result.code ?? 0,
    };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(output, null, 2)),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<RunClCommandInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    return { invocationMessage: `Running CL command: ${options.input.command}` };
  }
}
