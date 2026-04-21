---
name: cd-implement
description: 'Implement a cd:ready ticket: create a branch, write code (TDD), commit, open a PR, transition to cd:in-review'
allowed-tools:
  - mcp__cd-server__cd_get_ticket
  - mcp__cd-server__cd_write_artifact
  - mcp__cd-server__cd_transition_state
  - mcp__cd-server__cd_block_ticket
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
---

# Implement Ticket

Implement ticket #$ARGUMENTS.

## Process

1. **Load context.** Call `cd_get_ticket` with `issue_number: $ARGUMENTS`. Read the refinement artifact (the approved spec) and note the acceptance criteria.

2. **Transition to in-progress.** Call `cd_transition_state` with `new_state: in-progress`.

3. **Create (or resume) the branch.**
   - Derive `<slug>` as a short kebab-case form of the ticket title (max 50 chars).
   - Branch name: `cc/$ARGUMENTS-<slug>`.
   - Run via Bash: `git checkout -b cc/$ARGUMENTS-<slug>` — or `git checkout cc/$ARGUMENTS-<slug>` if it already exists.

4. **Implement following the spec.**
   - If the `superpowers:executing-plans` skill is available, invoke it using the refinement artifact as the plan.
   - Use `superpowers:test-driven-development` if available for any new code.
   - Otherwise, follow the refinement artifact's Approach section directly — write a failing test first, implement to make it pass, refactor.
   - Commit frequently with messages prefixed `[cc#$ARGUMENTS]`.

5. **Push and open the PR.**
   - `git push -u origin cc/$ARGUMENTS-<slug>` via Bash.
   - `gh pr create --title "[cc#$ARGUMENTS] <title>" --body "<body>" --head cc/$ARGUMENTS-<slug>` via Bash. The body should reference the issue: `Closes #$ARGUMENTS`.
   - Capture the PR number from the output.

6. **Write the implementation artifact.** Call `cd_write_artifact` with:
   - `issue_number`: $ARGUMENTS
   - `type`: `implementation`
   - `content`:

     ```markdown
     # Implementation for #<n>

     ## What was built

     ...

     ## Key decisions

     ...

     ## Deviations from the spec (and why)

     ...

     ## How to test

     ...
     ```

7. **Transition to in-review.** Call `cd_transition_state` with `new_state: in-review`.

## Rules

- Follow the refinement artifact. If the spec is wrong, call `cd_block_ticket` with the specific conflict rather than guessing.
- Every commit message starts with `[cc#$ARGUMENTS]`.
- Do not modify files outside the ticket's declared scope.
- All tests must pass locally before you push.
- If you hit an architectural uncertainty you cannot resolve, call `cd_block_ticket` — do not guess.
