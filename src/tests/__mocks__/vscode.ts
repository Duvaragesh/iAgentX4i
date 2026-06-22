import { vi } from 'vitest';

export class LanguageModelTextPart {
  constructor(public value: string) {}
}

export class LanguageModelToolResult {
  constructor(public parts: LanguageModelTextPart[]) {}
  getText(): string {
    return this.parts.map(p => p.value).join('');
  }
}

export class Range {
  constructor(
    public start: Position,
    public end: Position,
  ) {}
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export class WorkspaceEdit {
  replace = vi.fn();
}

export const Uri = {
  parse: vi.fn((s: string) => {
    const url = new URL(s.includes('://') ? s : `file://${s}`);
    return {
      scheme: url.protocol.replace(':', ''),
      path: url.pathname,
      fsPath: url.pathname,
      toString: () => s,
    };
  }),
  file: vi.fn((path: string) => ({
    scheme: 'file',
    path,
    fsPath: path,
    toString: () => `file://${path}`,
  })),
};

export const window = {
  activeTextEditor: undefined as unknown,
  visibleTextEditors: [] as unknown[],
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  createStatusBarItem: vi.fn(() => ({ text: '', show: vi.fn(), dispose: vi.fn() })),
};

export const workspace = {
  openTextDocument: vi.fn(),
  applyEdit: vi.fn().mockResolvedValue(true),
  getConfiguration: vi.fn(() => ({ get: vi.fn() })),
};

export const extensions = {
  getExtension: vi.fn(),
};

export const lm = {
  registerTool: vi.fn(),
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

export const StatusBarAlignment = { Left: 1, Right: 2 };
