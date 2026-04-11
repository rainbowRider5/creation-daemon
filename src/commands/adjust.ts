export function adjustCommand(_issue: string, _feedback?: string): Promise<void> {
  // TODO Phase 1:
  // 1. Fetch issue + artifacts + PR comments
  // 2. Spawn Claude with adjuster prompt + feedback
  // 3. Apply changes on the existing branch
  // 4. Write adjustment artifact
  // 5. Update meta.json
  console.log(`cc adjust #${_issue} — not yet implemented`);
  return Promise.resolve();
}
