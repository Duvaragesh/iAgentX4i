import * as vscode from 'vscode';
import { getConnection } from '../ibmiConnection.js';
import { castUtf8 } from '../utils/ccsidCast.js';
import type { ListUserProfilesInput, ListUserProfilesOutput } from '../types.js';

export class ListUserProfilesTool implements vscode.LanguageModelTool<ListUserProfilesInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ListUserProfilesInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { nameFilter, status, maxProfiles } = options.input;
    const max = Math.min(maxProfiles ?? 100, 500);

    const conditions: string[] = [];

    if (nameFilter) {
      const pattern = nameFilter.toUpperCase().replace(/\*/g, '%');
      conditions.push(`USER_NAME LIKE '${pattern}'`);
    }

    if (status && status !== '*ALL') {
      conditions.push(`STATUS = '${status.toUpperCase()}'`);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    const query = `SELECT USER_NAME, STATUS, USER_CLASS_NAME, PREVIOUS_SIGNON, ` +
      `DAYS_UNTIL_PASSWORD_EXPIRES, NO_PASSWORD_INDICATOR, ` +
      `${castUtf8('TEXT_DESCRIPTION', 50)} AS TEXT_DESCRIPTION ` +
      `FROM QSYS2.USER_INFO${whereClause} ` +
      `ORDER BY USER_NAME ` +
      `FETCH FIRST ${max} ROWS ONLY`;

    const rows = await getConnection().runSQL(query) as Record<string, unknown>[];

    const profiles = rows.map(r => ({
      userName: String(r['USER_NAME'] ?? ''),
      status: String(r['STATUS'] ?? ''),
      userClass: String(r['USER_CLASS_NAME'] ?? ''),
      previousSignon: r['PREVIOUS_SIGNON'] != null ? String(r['PREVIOUS_SIGNON']) : null,
      daysUntilPasswordExpires: r['DAYS_UNTIL_PASSWORD_EXPIRES'] != null
        ? Number(r['DAYS_UNTIL_PASSWORD_EXPIRES']) : null,
      noPasswordIndicator: String(r['NO_PASSWORD_INDICATOR'] ?? ''),
      description: r['TEXT_DESCRIPTION'] != null ? String(r['TEXT_DESCRIPTION']) : '',
    }));

    const result: ListUserProfilesOutput = { profiles, total: profiles.length };

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ListUserProfilesInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    const { nameFilter, status } = options.input;
    const scope = nameFilter ? `matching ${nameFilter}` : 'all profiles';
    const statusLabel = status && status !== '*ALL' ? ` (${status})` : '';
    return { invocationMessage: `Listing user profiles ${scope}${statusLabel}` };
  }
}
