---
name: cc-loop
description: 'One autonomous iteration: unblock replied tickets, pick the next actionable ticket by priority, dispatch it to the matching cc-* skill'
allowed-tools:
  - mcp__cc-server__cc_unblock_check
  - mcp__cc-server__cc_pick_next_ticket
  - mcp__cc-server__cc_get_ticket
  - mcp__cc-server__cc_transition_state
  - mcp__cc-server__cc_write_artifact
  - mcp__cc-server__cc_block_ticket
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
---

# Autonomous Loop Iteration

Process the highest-priority actionable ticket.

## Process

1. **Unblock replied tickets.** Call `cc_unblock_check`. Any ticket that received a human reply since being blocked transitions back to its previous state.

2. **Pick the next ticket.** Call `cc_pick_next_ticket`. The server returns the highest-priority actionable ticket (state priority × priority label), or `No actionable tickets found.`.

3. **If nothing to do:** Report "Nothing to do" and stop.

4. **Dispatch by state.** Look at the ticket's current state:
   - `draft` → follow the `/cc-refine` process on this ticket.
   - `refined` → the user approves refined specs manually; call `cc_transition_state` to `ready` only if the refinement artifact has no `Open Questions`. Otherwise, call `cc_block_ticket` with the unanswered questions.
   - `ready` → follow the `/cc-implement` process.
   - `in-progress` → resume implementation (check out the branch, continue from the last commit).
   - `in-review` → follow the `/cc-review` process.
   - (`blocked` and `done` tickets are filtered out by `cc_pick_next_ticket`.)

5. **Report action taken.** One or two sentences: ticket number, what you did, what state it's in now.

## Rules

- Do exactly one action per invocation. The loop is designed for repeated calls, not a single-shot full pipeline.
- Never skip `cc_unblock_check`. A blocked ticket that got a reply becomes the highest priority in its restored state.
- If you are uncertain which sub-skill to apply, call `cc_block_ticket` with the uncertainty and stop — do not guess.
