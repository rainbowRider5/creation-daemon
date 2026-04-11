export function readArtifacts(
  _issueNumber: number,
): Promise<{ filename: string; content: string }[]> {
  // TODO Phase 0:
  // 1. List files in docs/issues/<n>/
  // 2. Filter to *.md files
  // 3. Read and return contents
  throw new Error('Not yet implemented');
}

export function summarizeArtifacts(_issueNumber: number): Promise<string> {
  // TODO Phase 1:
  // 1. Read all artifacts
  // 2. Produce a condensed summary for agent context
  throw new Error('Not yet implemented');
}
