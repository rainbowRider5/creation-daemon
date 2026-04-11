export const CD_LABELS = {
  // Status labels
  'cd:draft': { color: 'e0e0e0', description: 'Rough idea, needs refinement' },
  'cd:refined': {
    color: 'c5def5',
    description: 'Has a spec, needs approval',
  },
  'cd:ready': { color: '0e8a16', description: 'Approved for implementation' },
  'cd:in-progress': {
    color: 'fbca04',
    description: 'Being implemented, branch exists',
  },
  'cd:in-review': { color: '1d76db', description: 'PR open, awaiting review' },
  'cd:done': { color: '0e8a16', description: 'Merged, complete' },
  'cd:blocked': {
    color: 'd93f0b',
    description: 'Needs human input',
  },
  // Priority labels
  'cd:p0-critical': { color: 'b60205', description: 'Do this first' },
  'cd:p1-high': { color: 'd93f0b', description: 'Important' },
  'cd:p2-medium': { color: 'fbca04', description: 'Normal (default)' },
  'cd:p3-low': { color: 'c2e0c6', description: 'Nice to have' },
} as const;

export function ensureLabels(): Promise<void> {
  // TODO: Create any missing cd:* labels on the repo
  throw new Error('Not yet implemented');
}
