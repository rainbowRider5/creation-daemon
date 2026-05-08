export type TicketState = 'draft' | 'refined' | 'ready' | 'in-progress' | 'in-review' | 'done' | 'blocked';
export type Priority = 'p0-critical' | 'p1-high' | 'p2-medium' | 'p3-low';
export declare const VALID_TRANSITIONS: Record<TicketState, TicketState[]>;
type TransitionResult = {
    valid: true;
} | {
    valid: false;
    reason: string;
};
export declare function validateTransition(from: TicketState, to: TicketState, previousState?: TicketState): TransitionResult;
export declare function getStateFromLabels(labels: string[]): TicketState | null;
export declare function labelForState(state: TicketState): string;
export declare function parsePriority(labels: string[]): Priority;
export {};
//# sourceMappingURL=state-machine.d.ts.map