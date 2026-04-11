export const CC_LABELS = {
  // Status labels
  'cc:draft': { color: 'e0e0e0', description: 'Rough idea, needs refinement' },
  'cc:refined': {
    color: 'c5def5',
    description: 'Has a spec, needs approval',
  },
  'cc:ready': { color: '0e8a16', description: 'Approved for implementation' },
  'cc:in-progress': {
    color: 'fbca04',
    description: 'Being implemented, branch exists',
  },
  'cc:in-review': { color: '1d76db', description: 'PR open, awaiting review' },
  'cc:done': { color: '0e8a16', description: 'Merged, complete' },
  'cc:blocked': {
    color: 'd93f0b',
    description: 'Needs human input',
  },
  // Priority labels
  'cc:p0-critical': { color: 'b60205', description: 'Do this first' },
  'cc:p1-high': { color: 'd93f0b', description: 'Important' },
  'cc:p2-medium': { color: 'fbca04', description: 'Normal (default)' },
  'cc:p3-low': { color: 'c2e0c6', description: 'Nice to have' },
} as const;

export function ensureLabels(): Promise<void> {
  // TODO: Create any missing cc:* labels on the repo
  throw new Error('Not yet implemented');
}
