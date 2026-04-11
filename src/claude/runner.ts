export interface RunResult {
  output: string;
  blocked: boolean;
  blockedQuestion: string | null;
}

export function runClaude(
  _systemPrompt: string,
  _userMessage: string,
  _cwd?: string,
): Promise<RunResult> {
  // TODO Phase 1:
  // 1. Spawn `claude` CLI with --print flag and piped prompt
  // 2. Capture stdout
  // 3. Parse output for BLOCKED markers
  // 4. Return structured result
  throw new Error('Not yet implemented');
}
