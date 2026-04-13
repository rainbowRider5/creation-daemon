import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/utils/git.js', () => ({
  getRemoteUrl: vi.fn(() => 'git@github.com:testowner/testrepo.git'),
  parseGitHubRemote: vi.fn(() => ({ owner: 'testowner', repo: 'testrepo' })),
}));

import { getRepoContext, CC_LABELS } from '../src/github.js';

describe('getRepoContext', () => {
  it('returns owner and repo from git remote', () => {
    const ctx = getRepoContext();
    expect(ctx).toEqual({ owner: 'testowner', repo: 'testrepo' });
  });
});

describe('CC_LABELS', () => {
  it('defines all status labels', () => {
    const labelNames = Object.keys(CC_LABELS);
    expect(labelNames).toContain('cc:draft');
    expect(labelNames).toContain('cc:refined');
    expect(labelNames).toContain('cc:ready');
    expect(labelNames).toContain('cc:in-progress');
    expect(labelNames).toContain('cc:in-review');
    expect(labelNames).toContain('cc:done');
    expect(labelNames).toContain('cc:blocked');
  });

  it('defines all priority labels', () => {
    const labelNames = Object.keys(CC_LABELS);
    expect(labelNames).toContain('cc:p0-critical');
    expect(labelNames).toContain('cc:p1-high');
    expect(labelNames).toContain('cc:p2-medium');
    expect(labelNames).toContain('cc:p3-low');
  });
});
