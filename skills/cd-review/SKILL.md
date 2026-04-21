---
name: cd-review
description: 'Review the PR for a cd:in-review ticket, write a review artifact, then approve (→ cd:done on merge) or request changes (→ cd:in-progress)'
allowed-tools:
  - mcp__cd-server__cd_get_ticket
  - mcp__cd-server__cd_write_artifact
  - mcp__cd-server__cd_transition_state
  - Bash
  - Read
  - Grep
  - Glob
---

# Review Ticket

Review the PR for ticket #$ARGUMENTS.

## Process

1. **Load context.** Call `cd_get_ticket` with `issue_number: $ARGUMENTS`. Read the refinement artifact (spec) and implementation artifact.

2. **Find the PR.** The implementation artifact references the PR. If not, run `gh pr list --search "cc#$ARGUMENTS" --state open` via Bash to find it.

3. **Read the diff.** Run `gh pr diff <pr-number>` via Bash.

4. **Apply review rigor.**
   - If the `superpowers:receiving-code-review` skill is available, invoke it to apply review standards (verify claims, test coverage, edge cases).
   - Otherwise, check inline: does the diff satisfy each acceptance criterion? Are there untested edge cases? Any security, performance, or readability issues?

5. **Write the review artifact.** Call `cd_write_artifact` with:
   - `issue_number`: $ARGUMENTS
   - `type`: `review`
   - `content`:

     ```markdown
     # Review for #<n>

     ## Summary

     What changed (one paragraph).

     ## Acceptance criteria check

     - [x] Criterion 1 — satisfied by <file>:<line>
     - [ ] Criterion 2 — missing or unclear

     ## Findings

     Issues by severity (blocking / non-blocking / nit).

     ## Verdict

     **Approved** — or — **Changes requested**
     ```

6. **Decide the next action.**
   - **Approved:** run `gh pr review <pr-number> --approve --body "<summary>"` via Bash. The ticket transitions to `done` when the PR merges; you do not need to transition manually here.
   - **Changes requested:** run `gh pr review <pr-number> --request-changes --body "<summary>"` via Bash, then call `cd_transition_state` with `new_state: in-progress`.

## Rules

- Evidence before assertions — every verdict cites a file or line number.
- Do not modify source code in this skill. Review is read-only.
- If the PR is missing or not tied to this ticket, call `cd_block_ticket` with a clarification question.
