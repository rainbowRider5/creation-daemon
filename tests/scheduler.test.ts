import { describe, it } from 'vitest';

describe('scheduler', () => {
  it.todo('picks unblocked tickets first');
  it.todo('sorts by status priority within same priority level');
  it.todo('sorts by priority label within same status');
  it.todo('skips tickets with unmet dependencies');
  it.todo('returns null when no tickets are actionable');
});
