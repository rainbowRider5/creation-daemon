import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  getStateFromLabels,
  labelForState,
  parsePriority,
  VALID_TRANSITIONS as _VALID_TRANSITIONS,
} from '../src/tickets/state-machine.js';
import type { TicketState } from '../src/tickets/state-machine.js';

describe('validateTransition', () => {
  describe('when transition is valid', () => {
    it('allows draft to refined', () => {
      const result = validateTransition('draft', 'refined');
      expect(result).toEqual({ valid: true });
    });

    it('allows in-review back to in-progress', () => {
      const result = validateTransition('in-review', 'in-progress');
      expect(result).toEqual({ valid: true });
    });

    it('allows any state to done', () => {
      const states: TicketState[] = ['draft', 'refined', 'ready', 'in-progress', 'in-review'];
      for (const state of states) {
        expect(validateTransition(state, 'done')).toEqual({ valid: true });
      }
    });

    it('allows any state to blocked', () => {
      const states: TicketState[] = ['draft', 'refined', 'ready', 'in-progress', 'in-review'];
      for (const state of states) {
        expect(validateTransition(state, 'blocked')).toEqual({ valid: true });
      }
    });

    it('allows blocked to previous state when previousState is provided', () => {
      const result = validateTransition('blocked', 'in-progress', 'in-progress');
      expect(result).toEqual({ valid: true });
    });
  });

  describe('when transition is invalid', () => {
    it('rejects draft to in-progress (must go through refined and ready)', () => {
      const result = validateTransition('draft', 'in-progress');
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toContain('draft');
    });

    it('rejects done to any state', () => {
      const result = validateTransition('done', 'draft');
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toContain('done');
    });

    it('rejects blocked without previousState', () => {
      const result = validateTransition('blocked', 'in-progress');
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toContain('previousState');
    });

    it('rejects blocked to a state that is not the previousState', () => {
      const result = validateTransition('blocked', 'ready', 'in-progress');
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toContain('previous');
    });
  });
});

describe('getStateFromLabels', () => {
  it('extracts state from cd: prefixed labels', () => {
    const labels = ['bug', 'cd:draft', 'cd:p2-medium'];
    expect(getStateFromLabels(labels)).toBe('draft');
  });

  it('returns null when no state label found', () => {
    const labels = ['bug', 'enhancement'];
    expect(getStateFromLabels(labels)).toBeNull();
  });

  it('ignores priority labels', () => {
    const labels = ['cd:p0-critical'];
    expect(getStateFromLabels(labels)).toBeNull();
  });

  it('throws when multiple state labels found', () => {
    const labels = ['cd:draft', 'cd:refined'];
    expect(() => getStateFromLabels(labels)).toThrow('multiple');
  });
});

describe('labelForState', () => {
  it('maps state to cd: label', () => {
    expect(labelForState('draft')).toBe('cd:draft');
    expect(labelForState('in-progress')).toBe('cd:in-progress');
  });
});

describe('parsePriority', () => {
  describe('when a known priority label is present', () => {
    it('returns p0-critical', () => {
      expect(parsePriority(['bug', 'cd:draft', 'cd:p0-critical'])).toBe('p0-critical');
    });

    it('returns p3-low', () => {
      expect(parsePriority(['cd:p3-low'])).toBe('p3-low');
    });
  });

  describe('when no priority label is present', () => {
    it('defaults to p2-medium', () => {
      expect(parsePriority(['cd:draft', 'bug'])).toBe('p2-medium');
    });

    it('defaults to p2-medium for empty labels', () => {
      expect(parsePriority([])).toBe('p2-medium');
    });
  });

  describe('when label looks priority-like but is not a known priority', () => {
    it('ignores it and returns the default', () => {
      expect(parsePriority(['cd:p99-fake', 'cd:draft'])).toBe('p2-medium');
    });
  });
});
