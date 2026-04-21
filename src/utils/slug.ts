/**
 * Convert an issue title into a branch-safe slug.
 * "Add user authentication!" → "add-user-authentication"
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Build a branch name from the config pattern.
 * Pattern: "cd/{issue}-{slug}" → "cd/42-add-user-auth"
 */
export function branchName(pattern: string, issueNumber: number, title: string): string {
  return pattern.replace('{issue}', String(issueNumber)).replace('{slug}', slugify(title));
}
