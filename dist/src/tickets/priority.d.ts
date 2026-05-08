import type { TicketState, Priority } from './state-machine.js';
type TicketSummary = {
    number: number;
    state: TicketState;
    priority: Priority;
    body: string;
};
export declare function sortByPriority<T extends TicketSummary>(tickets: T[]): T[];
export declare function parseDependencies(body: string): number[];
export declare function filterActionable<T extends TicketSummary>(tickets: T[], doneIssues: Set<number>): T[];
export {};
//# sourceMappingURL=priority.d.ts.map