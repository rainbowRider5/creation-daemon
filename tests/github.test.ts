import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/utils/git.js', () => ({
  getRemoteUrl: vi.fn(() => 'git@github.com:testowner/testrepo.git'),
  parseGitHubRemote: vi.fn(() => ({ owner: 'testowner', repo: 'testrepo' })),
}));

import { getRepoContext, CD_LABELS } from '../src/github.js';

describe('getRepoContext', () => {
  it('returns owner and repo from git remote', () => {
    const ctx = getRepoContext();
    expect(ctx).toEqual({ owner: 'testowner', repo: 'testrepo' });
  });
});

describe('CD_LABELS', () => {
  it('defines all status labels', () => {
    const labelNames = Object.keys(CD_LABELS);
    expect(labelNames).toContain('cd:draft');
    expect(labelNames).toContain('cd:refined');
    expect(labelNames).toContain('cd:ready');
    expect(labelNames).toContain('cd:in-progress');
    expect(labelNames).toContain('cd:in-review');
    expect(labelNames).toContain('cd:done');
    expect(labelNames).toContain('cd:blocked');
  });

  it('defines all priority labels', () => {
    const labelNames = Object.keys(CD_LABELS);
    expect(labelNames).toContain('cd:p0-critical');
    expect(labelNames).toContain('cd:p1-high');
    expect(labelNames).toContain('cd:p2-medium');
    expect(labelNames).toContain('cd:p3-low');
  });
});
