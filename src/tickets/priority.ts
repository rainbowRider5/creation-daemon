import type { TicketState, Priority } from './state-machine.js';

type TicketSummary = {
  number: number;
  state: TicketState;
  priority: Priority;
  body: string;
};

const STATE_PRIORITY: Record<string, number> = {
  'in-review': 0,
  'in-progress': 1,
  ready: 2,
  refined: 3,
  draft: 4,
};

const PRIORITY_ORDER: Record<string, number> = {
  'p0-critical': 0,
  'p1-high': 1,
  'p2-medium': 2,
  'p3-low': 3,
};

export function sortByPriority<T extends TicketSummary>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => {
    const stateA = STATE_PRIORITY[a.state] ?? 99;
    const stateB = STATE_PRIORITY[b.state] ?? 99;
    if (stateA !== stateB) return stateA - stateB;

    const prioA = PRIORITY_ORDER[a.priority] ?? 99;
    const prioB = PRIORITY_ORDER[b.priority] ?? 99;
    return prioA - prioB;
  });
}

export function parseDependencies(body: string): number[] {
  const match = /Depends on:\s*(#\d+(?:\s*,\s*#\d+)*)/.exec(body);
  if (!match) return [];
  return [...match[1].matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
}

export function filterActionable<T extends TicketSummary>(
  tickets: T[],
  doneIssues: Set<number>,
): T[] {
  return tickets.filter((ticket) => {
    if (ticket.state === 'blocked' || ticket.state === 'done') return false;

    const deps = parseDependencies(ticket.body);
    return deps.every((dep) => doneIssues.has(dep));
  });
}
