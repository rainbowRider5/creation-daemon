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

const PRIORITY_LABELS: Priority[] = ['p0-critical', 'p1-high', 'p2-medium', 'p3-low'];
const DEFAULT_PRIORITY: Priority = 'p2-medium';

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

function isTicketState(value: string): value is TicketState {
  return (STATE_LABELS as string[]).includes(value);
}

export function getStateFromLabels(labels: string[]): TicketState | null {
  const stateLabels = labels
    .filter((l) => l.startsWith('cd:'))
    .map((l) => l.slice(3))
    .filter(isTicketState);

  if (stateLabels.length === 0) return null;
  if (stateLabels.length > 1) {
    throw new Error(`Issue has multiple state labels: ${stateLabels.join(', ')}`);
  }
  return stateLabels[0];
}

export function labelForState(state: TicketState) {
  return `cd:${state}`;
}

function isPriority(value: string): value is Priority {
  return (PRIORITY_LABELS as string[]).includes(value);
}

export function parsePriority(labels: string[]): Priority {
  for (const label of labels) {
    if (!label.startsWith('cd:')) continue;
    const value = label.slice(3);
    if (isPriority(value)) return value;
  }
  return DEFAULT_PRIORITY;
}
