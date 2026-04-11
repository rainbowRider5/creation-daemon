export interface AgentContext {
  meta: object | null;
  artifacts: string[];
  relevantFiles: string[];
  humanReply: string | null;
}

export function gatherContext(_issueNumber: number): Promise<AgentContext> {
  // TODO Phase 1:
  // 1. Read docs/issues/<n>/meta.json
  // 2. Read all artifact files in docs/issues/<n>/
  // 3. If unblocked, include the human's reply comment
  // 4. Identify relevant source files from the spec
  throw new Error('Not yet implemented');
}
