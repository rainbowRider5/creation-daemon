export function initCommand(): Promise<void> {
  // TODO Phase 0:
  // 1. Detect git remote → derive owner/repo
  // 2. Copy templates/ into target project (.creation-daemon/config.yml, docs/ dirs)
  // 3. Append creation-daemon instructions to CLAUDE.md
  // 4. Ensure cd:* labels exist on the GitHub repo
  // 5. Add docs/ to .gitignore exclusions if needed
  console.log('/cd-init — not yet implemented');
  return Promise.resolve();
}
