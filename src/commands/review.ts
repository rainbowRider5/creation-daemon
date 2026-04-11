export function reviewCommand(_issue: string): Promise<void> {
  // TODO Phase 1:
  // 1. Fetch issue + PR + artifacts
  // 2. Spawn Claude with reviewer prompt + diff context
  // 3. Write review artifact
  // 4. Post review on PR (approve or request changes)
  // 5. Update meta.json + GitHub labels
  console.log(`/cd-review #${_issue} — not yet implemented`);
  return Promise.resolve();
}
