import type { TicketState, Priority } from '../tickets/state-machine.js';
export type ArtifactType = 'draft' | 'refinement' | 'design' | 'implementation' | 'review' | 'adjustment';
export type IssueMeta = {
    issue: number;
    title: string;
    state: TicketState;
    priority: Priority;
    branch: string | null;
    pr: number | null;
    dependencies: number[];
    artifacts: {
        file: string;
        type: ArtifactType;
        created: string;
    }[];
    blocked: boolean;
    blockedQuestion: string | null;
    previousState: TicketState | null;
    created: string;
    updated: string;
};
export declare function readMeta(issueNumber: number, baseDir?: string): IssueMeta | null;
export declare function writeMeta(issueNumber: number, meta: IssueMeta, baseDir?: string): void;
export declare function writeArtifact(issueNumber: number, type: ArtifactType, content: string, baseDir?: string): string;
export declare function readArtifacts(issueNumber: number, baseDir?: string): {
    file: string;
    type: ArtifactType;
    content: string;
}[];
//# sourceMappingURL=artifact-store.d.ts.map