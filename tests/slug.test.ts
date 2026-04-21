import { describe, it, expect } from 'vitest';
import { slugify, branchName } from '../src/utils/slug.js';

describe('slugify', () => {
  it('converts title to lowercase kebab-case', () => {
    expect(slugify('Add User Authentication')).toBe('add-user-authentication');
  });

  it('strips special characters', () => {
    expect(slugify('Fix bug #42!')).toBe('fix-bug-42');
  });

  it('truncates to 50 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(50);
  });
});

describe('branchName', () => {
  it('builds branch name from pattern', () => {
    expect(branchName('cd/{issue}-{slug}', 42, 'Add user auth')).toBe('cd/42-add-user-auth');
  });
});
