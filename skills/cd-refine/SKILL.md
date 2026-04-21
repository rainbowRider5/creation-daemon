---
name: cd-refine
description: 'Refine a cd:draft ticket into a detailed spec artifact and transition it to cd:refined'
allowed-tools:
  - mcp__cd-server__cd_get_ticket
  - mcp__cd-server__cd_write_artifact
  - mcp__cd-server__cd_transition_state
  - mcp__cd-server__cd_block_ticket
  - Read
  - Grep
  - Glob
---

# Refine Ticket

Refine ticket #$ARGUMENTS into a detailed spec.

## Process

1. **Load context.** Call `cd_get_ticket` with `issue_number: $ARGUMENTS`. Read the issue body and any existing artifacts.

2. **Ground the spec in current state.** Use Read, Grep, and Glob to examine the parts of the codebase the ticket will touch. Note file paths and existing patterns.

3. **Produce the spec.**
   - If the `superpowers:writing-plans` skill is available, invoke it with the ticket body + codebase context as input and use its output as the spec.
   - Otherwise, write the spec yourself using this template:

     ```markdown
     # Refinement for #<n>: <title>

     ## Goal

     What this ticket accomplishes (one sentence).

     ## Current State

     What exists today, with exact file paths.

     ## Approach

     Step-by-step implementation plan.

     ## Files to Change

     - `path/to/file.ts` — what will change
     - …

     ## Acceptance Criteria

     - [ ] Testable item one
     - [ ] Testable item two

     ## Open Questions

     - Anything that needs human input before implementation.
     ```

4. **Write the artifact.** Call `cd_write_artifact` with:
   - `issue_number`: $ARGUMENTS
   - `type`: `refinement`
   - `content`: the spec you produced

5. **Decide the next state.**
   - If the spec has no unanswered architectural questions, call `cd_transition_state` with `new_state: refined`.
   - If there are open questions you cannot resolve from the codebase alone, call `cd_block_ticket` with a specific question. Do not transition to `refined` in that case.

## Rules

- Never guess at architectural decisions — ask via `cd_block_ticket`.
- Acceptance criteria must be testable (each item should correspond to a runnable assertion).
- Do not modify source code in this skill. Refinement is read-only.
