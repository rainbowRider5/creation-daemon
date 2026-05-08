/**
 * Convert an issue title into a branch-safe slug.
 * "Add user authentication!" → "add-user-authentication"
 */
export declare function slugify(title: string): string;
/**
 * Build a branch name from the config pattern.
 * Pattern: "cd/{issue}-{slug}" → "cd/42-add-user-auth"
 */
export declare function branchName(pattern: string, issueNumber: number, title: string): string;
//# sourceMappingURL=slug.d.ts.map