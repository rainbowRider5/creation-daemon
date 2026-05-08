/**
 * Convert an issue title into a branch-safe slug.
 * "Add user authentication!" → "add-user-authentication"
 */
export function slugify(title) {
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
export function branchName(pattern, issueNumber, title) {
    return pattern.replace('{issue}', String(issueNumber)).replace('{slug}', slugify(title));
}
//# sourceMappingURL=slug.js.map