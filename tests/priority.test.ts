import { describe, it, expect } from 'vitest';
import { sortByPriority, filterActionable, parseDependencies } from '../src/tickets/priority.js';
import type { TicketState, Priority } from '../src/tickets/state-machine.js';

type TicketSummary = {
  number: number;
  state: TicketState;
  priority: Priority;
  body: string;
};

describe('sortByPriority', () => {
  it('sorts by state priority (closer to done first)', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'draft', priority: 'p2-medium', body: '' },
      { number: 2, state: 'in-review', priority: 'p2-medium', body: '' },
      { number: 3, state: 'ready', priority: 'p2-medium', body: '' },
    ];
    const sorted = sortByPriority(tickets);
    expect(sorted.map((t) => t.number)).toEqual([2, 3, 1]);
  });

  it('sorts by priority label within same state', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'ready', priority: 'p3-low', body: '' },
      { number: 2, state: 'ready', priority: 'p0-critical', body: '' },
      { number: 3, state: 'ready', priority: 'p1-high', body: '' },
    ];
    const sorted = sortByPriority(tickets);
    expect(sorted.map((t) => t.number)).toEqual([2, 3, 1]);
  });

  it('state priority takes precedence over priority label', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'draft', priority: 'p0-critical', body: '' },
      { number: 2, state: 'in-review', priority: 'p3-low', body: '' },
    ];
    const sorted = sortByPriority(tickets);
    expect(sorted.map((t) => t.number)).toEqual([2, 1]);
  });
});

describe('filterActionable', () => {
  it('removes blocked tickets', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'blocked', priority: 'p2-medium', body: '' },
      { number: 2, state: 'ready', priority: 'p2-medium', body: '' },
    ];
    const result = filterActionable(tickets, new Set());
    expect(result.map((t) => t.number)).toEqual([2]);
  });

  it('removes done tickets', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'done', priority: 'p2-medium', body: '' },
      { number: 2, state: 'ready', priority: 'p2-medium', body: '' },
    ];
    const result = filterActionable(tickets, new Set());
    expect(result.map((t) => t.number)).toEqual([2]);
  });

  it('removes tickets with unmet dependencies', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'ready', priority: 'p2-medium', body: 'Depends on: #99' },
      { number: 2, state: 'ready', priority: 'p2-medium', body: '' },
    ];
    const doneIssues = new Set<number>();
    const result = filterActionable(tickets, doneIssues);
    expect(result.map((t) => t.number)).toEqual([2]);
  });

  it('keeps tickets whose dependencies are all done', () => {
    const tickets: TicketSummary[] = [
      { number: 1, state: 'ready', priority: 'p2-medium', body: 'Depends on: #10, #20' },
    ];
    const doneIssues = new Set([10, 20]);
    const result = filterActionable(tickets, doneIssues);
    expect(result.map((t) => t.number)).toEqual([1]);
  });
});

describe('parseDependencies', () => {
  it('parses "Depends on: #38, #41" from body', () => {
    expect(parseDependencies('Some text\nDepends on: #38, #41\nMore text')).toEqual([38, 41]);
  });

  it('returns empty array when no dependencies', () => {
    expect(parseDependencies('No deps here')).toEqual([]);
  });

  it('handles single dependency', () => {
    expect(parseDependencies('Depends on: #5')).toEqual([5]);
  });
});
