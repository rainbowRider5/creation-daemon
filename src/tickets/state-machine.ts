export type TicketState =
  | 'draft'
  | 'refined'
  | 'ready'
  | 'in-progress'
  | 'in-review'
  | 'done'
  | 'blocked';

export type Priority = 'p0-critical' | 'p1-high' | 'p2-medium' | 'p3-low';

const STATE_LABELS: TicketState[] = [
  'draft',
  'refined',
  'ready',
  'in-progress',
  'in-review',
  'done',
  'blocked',
];

export const VALID_TRANSITIONS: Record<TicketState, TicketState[]> = {
  draft: ['refined', 'done', 'blocked'],
  refined: ['ready', 'done', 'blocked'],
  ready: ['in-progress', 'done', 'blocked'],
  'in-progress': ['in-review', 'done', 'blocked'],
  'in-review': ['in-progress', 'done', 'blocked'],
  done: [],
  blocked: [],
};

type TransitionResult = { valid: true } | { valid: false; reason: string };

export function validateTransition(
  from: TicketState,
  to: TicketState,
  previousState?: TicketState,
): TransitionResult {
  if (from === 'blocked') {
    if (!previousState) {
      return { valid: false, reason: 'Transition from blocked requires previousState' };
    }
    if (to !== previousState) {
      return {
        valid: false,
        reason: `Can only transition from blocked back to previous state (${previousState}), not ${to}`,
      };
    }
    return { valid: true };
  }

  if (VALID_TRANSITIONS[from].includes(to)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Cannot transition from ${from} to ${to}. Allowed: ${VALID_TRANSITIONS[from].join(', ') || 'none'}`,
  };
}

export function getStateFromLabels(labels: string[]): TicketState | null {
  const stateLabels = labels
    .filter((l) => l.startsWith('cd:'))
    .map((l) => l.slice(3))
    .filter((s): s is TicketState => STATE_LABELS.includes(s as TicketState));

  if (stateLabels.length === 0) return null;
  if (stateLabels.length > 1) {
    throw new Error(`Issue has multiple state labels: ${stateLabels.join(', ')}`);
  }
  return stateLabels[0];
}

export function labelForState(state: TicketState) {
  return `cd:${state}`;
}
