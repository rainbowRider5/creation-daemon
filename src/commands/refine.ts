export function refineCommand(_issue: string): Promise<void> {
  // TODO Phase 1:
  // 1. Fetch issue + existing artifacts
  // 2. Spawn Claude with refiner prompt + context
  // 3. Write refinement artifact
  // 4. Update meta.json + GitHub labels
  console.log(`cc refine #${_issue} — not yet implemented`);
  return Promise.resolve();
}
