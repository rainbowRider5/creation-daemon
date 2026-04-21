---
name: cd-adjust
description: "Apply feedback or a small change to a cd:in-progress or cd:in-review ticket's branch — commit, push, write an adjustment artifact"
allowed-tools:
  - mcp__cd-server__cd_get_ticket
  - mcp__cd-server__cd_write_artifact
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
---

# Adjust Ticket

Apply this adjustment: $ARGUMENTS

The argument format is `<issue-number> <feedback text>` — the first whitespace-separated token is the issue number, the rest is the feedback.

## Process

1. **Parse arguments.** Split $ARGUMENTS into `<issue-number>` and `<feedback>`.

2. **Load context.** Call `cd_get_ticket` with the parsed issue number. Read the refinement artifact and any prior adjustments.

3. **Check out the ticket branch.** Run `git checkout cc/<issue-number>-<slug>` via Bash. The slug is recorded in the ticket's meta.json (from `cd_get_ticket`) or derivable from the title.

4. **Make the change.** Apply the feedback. Keep edits minimal and focused.

5. **Commit.** Run via Bash:

   ```
   git commit -am "[cc#<issue-number>] adjust: <short summary of feedback>"
   ```

6. **Push.** Run `git push` via Bash. This updates the open PR.

7. **Write the adjustment artifact.** Call `cd_write_artifact` with:
   - `issue_number`: the parsed issue number
   - `type`: `adjustment`
   - `content`:

     ```markdown
     # Adjustment for #<n>

     ## Requested change

     <feedback verbatim>

     ## What changed

     <files and summary>

     ## Rationale

     <why this approach>
     ```

## Rules

- Do not transition state. `/cd-adjust` leaves the ticket in whatever state it was in.
- Do not modify files outside the adjustment's scope.
- If the branch does not exist, the ticket is not in-progress — stop and tell the user.
