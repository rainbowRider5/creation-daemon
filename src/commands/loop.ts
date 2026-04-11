interface LoopOptions {
  once?: boolean;
  dryRun?: boolean;
}

export function loopCommand(_options: LoopOptions): Promise<void> {
  // TODO Phase 2:
  // 1. Fetch all open cd:* issues
  // 2. Check blocked issues for new human comments → unblock
  // 3. Filter out blocked/done/unmet-dependency tickets
  // 4. Sort by priority model
  // 5. Pick top ticket, determine action from status
  // 6. Gather context, spawn appropriate agent
  // 7. Parse output (blocked? success?)
  // 8. Write artifacts, update meta/labels, commit+push
  // 9. Wait poll_interval, repeat (unless --once)
  console.log('/cd-loop — not yet implemented');
  return Promise.resolve();
}
