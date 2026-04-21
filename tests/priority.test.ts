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
  describe('when tickets are in different states', () => {
    it('orders by how close to done each state is', () => {
      const tickets: TicketSummary[] = [
        { number: 1, state: 'draft', priority: 'p2-medium', body: '' },
        { number: 2, state: 'in-review', priority: 'p2-medium', body: '' },
        { number: 3, state: 'ready', priority: 'p2-medium', body: '' },
      ];
      const sorted = sortByPriority(tickets);
      expect(sorted.map((t) => t.number)).toEqual([2, 3, 1]);
    });
  });

  describe('when tickets share a state', () => {
    it('orders by priority label', () => {
      const tickets: TicketSummary[] = [
        { number: 1, state: 'ready', priority: 'p3-low', body: '' },
        { number: 2, state: 'ready', priority: 'p0-critical', body: '' },
        { number: 3, state: 'ready', priority: 'p1-high', body: '' },
      ];
      const sorted = sortByPriority(tickets);
      expect(sorted.map((t) => t.number)).toEqual([2, 3, 1]);
    });
  });

  describe('when state order and priority label disagree', () => {
    it('state order wins', () => {
      const tickets: TicketSummary[] = [
        { number: 1, state: 'draft', priority: 'p0-critical', body: '' },
        { number: 2, state: 'in-review', priority: 'p3-low', body: '' },
      ];
      const sorted = sortByPriority(tickets);
      expect(sorted.map((t) => t.number)).toEqual([2, 1]);
    });
  });
});

describe('filterActionable', () => {
  describe('when a ticket is blocked', () => {
    it('is removed', () => {
      const tickets: TicketSummary[] = [
        { number: 1, state: 'blocked', priority: 'p2-medium', body: '' },
        { number: 2, state: 'ready', priority: 'p2-medium', body: '' },
      ];
      const result = filterActionable(tickets, new Set());
      expect(result.map((t) => t.number)).toEqual([2]);
    });
  });

  describe('when a ticket is done', () => {
    it('is removed', () => {
      const tickets: TicketSummary[] = [
        { number: 1, state: 'done', priority: 'p2-medium', body: '' },
        { number: 2, state: 'ready', priority: 'p2-medium', body: '' },
      ];
      const result = filterActionable(tickets, new Set());
      expect(result.map((t) => t.number)).toEqual([2]);
    });
  });

  describe('when a ticket has unmet dependencies', () => {
    it('is removed', () => {
      const tickets: TicketSummary[] = [
        { number: 1, state: 'ready', priority: 'p2-medium', body: 'Depends on: #99' },
        { number: 2, state: 'ready', priority: 'p2-medium', body: '' },
      ];
      const result = filterActionable(tickets, new Set<number>());
      expect(result.map((t) => t.number)).toEqual([2]);
    });
  });

  describe('when all dependencies are done', () => {
    it('keeps the ticket', () => {
      const tickets: TicketSummary[] = [
        { number: 1, state: 'ready', priority: 'p2-medium', body: 'Depends on: #10, #20' },
      ];
      const result = filterActionable(tickets, new Set([10, 20]));
      expect(result.map((t) => t.number)).toEqual([1]);
    });
  });
});

describe('parseDependencies', () => {
  describe('when body contains "Depends on: #N, #M"', () => {
    it('returns both numbers', () => {
      expect(parseDependencies('Some text\nDepends on: #38, #41\nMore text')).toEqual([38, 41]);
    });
  });

  describe('when body has a single dependency', () => {
    it('returns a one-element array', () => {
      expect(parseDependencies('Depends on: #5')).toEqual([5]);
    });
  });

  describe('when body has no dependencies', () => {
    it('returns an empty array', () => {
      expect(parseDependencies('No deps here')).toEqual([]);
    });
  });
});
