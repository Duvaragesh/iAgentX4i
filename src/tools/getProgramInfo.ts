import * as vscode from 'vscode';
import { getConnection } from '../ibmiConnection.js';
import { castUtf8 } from '../utils/ccsidCast.js';
import type { GetProgramInfoInput, GetProgramInfoOutput } from '../types.js';

export class GetProgramInfoTool implements vscode.LanguageModelTool<GetProgramInfoInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetProgramInfoInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { library, program, objectType } = options.input;
    const lib = library.toUpperCase();
    const pgm = program.toUpperCase();
    const objType = (objectType ?? '*PGM').toUpperCase();

    if (objType !== '*PGM' && objType !== '*SRVPGM') {
      throw new Error('objectType must be *PGM or *SRVPGM');
    }

    const infoQuery = `SELECT OBJNAME, OBJTYPE, OBJATTRIBUTE, ` +
      `${castUtf8('OBJTEXT', 50)} AS OBJTEXT, ` +
      `OBJOWNER, OBJSIZE, OBJCREATED, LAST_CHANGED_TIMESTAMP, ` +
      `PROGRAM_ATTRIBUTE, TARGET_RELEASE, ACTIVATION_GROUP ` +
      `FROM TABLE(QSYS2.OBJECT_STATISTICS(` +
      `OBJECT_LIBRARY => '${lib}', OBJECT_TYPE => '${objType}', OBJECT_NAME => '${pgm}')) ` +
      `FETCH FIRST 1 ROW ONLY`;

    const conn = getConnection();
    const infoRows = await conn.runSQL(infoQuery) as Record<string, unknown>[];

    let result: GetProgramInfoOutput;
    if (infoRows.length === 0) {
      result = { exists: false, library: lib, program: pgm, objectType: objType, boundModules: [] };
    } else {
      const r = infoRows[0];

      // Fetch bound modules (only available for *PGM and *SRVPGM)
      const moduleQuery = `SELECT BOUND_MODULE_LIBRARY, BOUND_MODULE, MODULE_ATTRIBUTE ` +
        `FROM QSYS2.BOUND_MODULE_INFO ` +
        `WHERE PROGRAM_LIBRARY = '${lib}' AND PROGRAM_NAME = '${pgm}' ` +
        `AND PROGRAM_TYPE = '${objType}' ` +
        `ORDER BY BOUND_MODULE`;

      let boundModules: Array<{ moduleLibrary: string; module: string; attribute: string }> = [];
      try {
        const moduleRows = await conn.runSQL(moduleQuery) as Record<string, unknown>[];
        boundModules = moduleRows.map(m => ({
          moduleLibrary: String(m['BOUND_MODULE_LIBRARY'] ?? ''),
          module: String(m['BOUND_MODULE'] ?? ''),
          attribute: String(m['MODULE_ATTRIBUTE'] ?? ''),
        }));
      } catch {
        // BOUND_MODULE_INFO may not be available on all OS versions — not fatal
      }

      result = {
        exists: true,
        library: lib,
        program: pgm,
        objectType: String(r['OBJTYPE'] ?? objType),
        attribute: r['OBJATTRIBUTE'] != null ? String(r['OBJATTRIBUTE']) : '',
        description: r['OBJTEXT'] != null ? String(r['OBJTEXT']) : '',
        owner: r['OBJOWNER'] != null ? String(r['OBJOWNER']) : '',
        size: r['OBJSIZE'] != null ? Number(r['OBJSIZE']) : null,
        createTime: r['OBJCREATED'] != null ? String(r['OBJCREATED']) : null,
        lastModifiedTime: r['LAST_CHANGED_TIMESTAMP'] != null ? String(r['LAST_CHANGED_TIMESTAMP']) : null,
        programAttribute: r['PROGRAM_ATTRIBUTE'] != null ? String(r['PROGRAM_ATTRIBUTE']) : '',
        targetRelease: r['TARGET_RELEASE'] != null ? String(r['TARGET_RELEASE']) : '',
        activationGroup: r['ACTIVATION_GROUP'] != null ? String(r['ACTIVATION_GROUP']) : '',
        boundModules,
      };
    }

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
    ]);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetProgramInfoInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    const { library, program, objectType } = options.input;
    return { invocationMessage: `Getting program info for ${library}/${program} (${objectType ?? '*PGM'})` };
  }
}
