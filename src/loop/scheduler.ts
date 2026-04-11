import type { CcIssue } from '../github/issues.js';

const _STATUS_PRIORITY: Record<string, number> = {
  'cc:blocked': 0, // only if just unblocked (priority 1)
  'cc:in-review': 2,
  'cc:in-progress': 3,
  'cc:ready': 4,
  'cc:refined': 5,
  'cc:draft': 6,
};

const _PRIORITY_ORDER: Record<string, number> = {
  'cc:p0-critical': 0,
  'cc:p1-high': 1,
  'cc:p2-medium': 2,
  'cc:p3-low': 3,
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
