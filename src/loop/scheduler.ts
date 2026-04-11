import type { CcIssue } from '../github/issues.js';

const _STATUS_PRIORITY: Record<string, number> = {
  'cd:blocked': 0, // only if just unblocked (priority 1)
  'cd:in-review': 2,
  'cd:in-progress': 3,
  'cd:ready': 4,
  'cd:refined': 5,
  'cd:draft': 6,
};

const _PRIORITY_ORDER: Record<string, number> = {
  'cd:p0-critical': 0,
  'cd:p1-high': 1,
  'cd:p2-medium': 2,
  'cd:p3-low': 3,
};

export function pickNextTicket(_issues: CcIssue[], _unblockedIds: Set<number>): CcIssue | null {
  // TODO Phase 2:
  // 1. Filter out done, still-blocked, unmet-dependency tickets
  // 2. Sort by: unblocked first, then status priority, then priority label
  // 3. Return top ticket or null
  throw new Error('Not yet implemented');
}

export function determineAction(_issue: CcIssue): 'refine' | 'implement' | 'review' | 'continue' {
  // TODO Phase 2: map status label to the appropriate action
  throw new Error('Not yet implemented');
}
