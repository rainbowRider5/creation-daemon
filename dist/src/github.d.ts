export declare const CD_LABELS: Record<string, {
    color: string;
    description: string;
}>;
export declare function getRepoContext(): {
    owner: string;
    repo: string;
};
export declare function createIssue(title: string, body: string, labels: string[]): Promise<{
    number: number;
    url: string;
}>;
export declare function getIssue(issueNumber: number): Promise<{
    number: number;
    title: string;
    body: string;
    labels: string[];
    state: string;
}>;
export declare function listIssuesByLabel(labelPrefix?: string): Promise<{
    number: number;
    title: string;
    body: string;
    labels: string[];
}[]>;
export declare function updateLabels(issueNumber: number, add: string[], remove: string[]): Promise<void>;
export declare function ensureLabels(): Promise<{
    created: number;
    existing: number;
}>;
export declare function postComment(issueNumber: number, body: string): Promise<{
    id: number;
    url: string;
}>;
export declare function getCommentsSince(issueNumber: number, since: string): Promise<{
    id: number;
    body: string;
    user: string;
    created: string;
}[]>;
//# sourceMappingURL=github.d.ts.map