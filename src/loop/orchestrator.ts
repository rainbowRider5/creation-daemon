interface OrchestratorOptions {
  once?: boolean;
  dryRun?: boolean;
}

export function runLoop(_options: OrchestratorOptions): Promise<void> {
  // TODO Phase 2:
  // Main loop: fetch → unblock → filter → sort → pick → run → commit → repeat
  throw new Error('Not yet implemented');
}
