---
name: cc-review
description: 'Review the PR for a cc:in-review ticket, write a review artifact, then approve or request changes (→ cc:in-progress). Re-run after merge to finalize to cc:done.'
allowed-tools:
  - mcp__cc-server__cc_get_ticket
  - mcp__cc-server__cc_write_artifact
  - mcp__cc-server__cc_transition_state
  - mcp__cc-server__cc_block_ticket
  - Bash
  - Read
  - Grep
  - Glob
---

# Review Ticket

Review the PR for ticket #$ARGUMENTS.

## Process

1. **Load context.** Call `cc_get_ticket` with `issue_number: $ARGUMENTS`. Read the refinement artifact (spec) and implementation artifact.

2. **Find the PR.** The implementation artifact references the PR. If not, run `gh pr list --search "cc#$ARGUMENTS" --state all` via Bash to find it (include merged/closed so post-merge finalization still works).

3. **Check PR state first.** Run `gh pr view <pr-number> --json state -q .state` via Bash. If the result is `MERGED`, the review has already happened and the PR is in — call `cc_transition_state` with `new_state: done` and stop. This makes `/cc-review` safe to re-run after a merge to finalize the ticket.

4. **Read the diff.** Run `gh pr diff <pr-number>` via Bash.

5. **Apply review rigor.**
   - If the `superpowers:receiving-code-review` skill is available, invoke it to apply review standards (verify claims, test coverage, edge cases).
   - Otherwise, check inline: does the diff satisfy each acceptance criterion? Are there untested edge cases? Any security, performance, or readability issues?

6. **Write the review artifact.** Call `cc_write_artifact` with:
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

7. **Decide the next action.**
   - **Approved:**
     - Run `gh pr review <pr-number> --approve --body "<summary>"` via Bash.
     - Re-check merge state: `gh pr view <pr-number> --json state -q .state`.
       - If `MERGED` (e.g. auto-merge was on), call `cc_transition_state` with `new_state: done`.
       - If `OPEN`, leave the ticket in `cc:in-review` and tell the user: "PR approved. After merging, run `/cc-review $ARGUMENTS` again to finalize the ticket to `cc:done`." The next `/cc-review` invocation will pick up the merged state via step 3 and transition automatically.
   - **Changes requested:** run `gh pr review <pr-number> --request-changes --body "<summary>"` via Bash, then call `cc_transition_state` with `new_state: in-progress`.

## Rules

- Evidence before assertions — every verdict cites a file or line number.
- Do not modify source code in this skill. Review is read-only.
- If the PR is missing or not tied to this ticket, call `cc_block_ticket` with a clarification question.
