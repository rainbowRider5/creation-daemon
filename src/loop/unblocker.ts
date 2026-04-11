export function checkForUnblocks(_blockedIssueNumbers: number[]): Promise<Set<number>> {
  // TODO Phase 2:
  // 1. For each blocked issue, check for new human comments since blocked_at
  // 2. If found, remove cc:blocked label, set blocked: false in meta
  // 3. Return set of newly-unblocked issue numbers
  throw new Error('Not yet implemented');
}
