---
name: cd-loop
description: 'One autonomous iteration: unblock replied tickets, pick the next actionable ticket by priority, dispatch it to the matching cd-* skill'
allowed-tools:
  - mcp__cd-server__cd_unblock_check
  - mcp__cd-server__cd_pick_next_ticket
  - mcp__cd-server__cd_get_ticket
  - mcp__cd-server__cd_transition_state
  - mcp__cd-server__cd_write_artifact
  - mcp__cd-server__cd_block_ticket
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

1. **Unblock replied tickets.** Call `cd_unblock_check`. Any ticket that received a human reply since being blocked transitions back to its previous state.

2. **Pick the next ticket.** Call `cd_pick_next_ticket`. The server returns the highest-priority actionable ticket (state priority × priority label), or `No actionable tickets found.`.

3. **If nothing to do:** Report "Nothing to do" and stop.

4. **Dispatch by state.** Look at the ticket's current state:
   - `draft` → follow the `/cd-refine` process on this ticket.
   - `refined` → the autonomous loop auto-approves when safe: if the refinement artifact has no `## Open Questions` section (or that section is empty), call `cd_transition_state` with `new_state: ready`. Otherwise, call `cd_block_ticket` with the unanswered questions so a human can answer. (A human running `/cd-refine` can still manually block instead of advancing.)
   - `ready` → follow the `/cd-implement` process.
   - `in-progress` → resume implementation (check out the branch, continue from the last commit).
   - `in-review` → follow the `/cd-review` process. If the PR is already merged, `/cd-review` will transition the ticket to `done`.
   - (`blocked` and `done` tickets are filtered out by `cd_pick_next_ticket`.)

5. **Report action taken.** One or two sentences: ticket number, what you did, what state it's in now.

## Rules

- Do exactly one action per invocation. The loop is designed for repeated calls, not a single-shot full pipeline.
- Never skip `cd_unblock_check`. A blocked ticket that got a reply becomes the highest priority in its restored state.
- If you are uncertain which sub-skill to apply, call `cd_block_ticket` with the uncertainty and stop — do not guess.
