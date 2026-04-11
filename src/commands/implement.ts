export function implementCommand(_issue: string): Promise<void> {
  // TODO Phase 1:
  // 1. Fetch issue + artifacts
  // 2. Create/switch to branch cc/<issue>-<slug>
  // 3. Spawn Claude with implementer prompt + context
  // 4. Write implementation artifact
  // 5. Commit, push, open PR
  // 6. Update meta.json + GitHub labels
  console.log(`cc implement #${_issue} — not yet implemented`);
  return Promise.resolve();
}
