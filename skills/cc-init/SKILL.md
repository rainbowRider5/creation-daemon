---
name: cc-init
description: 'First-run bootstrap for claude-create: creates cc:* labels, docs/issues and docs/visions directories, and appends the claude-create section to the project CLAUDE.md'
allowed-tools:
  - mcp__cc-server__cc_ensure_labels
  - mcp__cc-server__cc_get_status
  - Bash
  - Read
  - Write
  - Edit
---

# Initialize claude-create in this project

Run this once after installing the claude-create plugin. Every step is idempotent — re-running is safe.

## Process

1. **Ensure cc:\* labels exist on the GitHub repo.** Call `cc_ensure_labels`. Report the counts (created vs already existing).

2. **Create artifact directories.** Run `mkdir -p docs/issues docs/visions` via Bash.

3. **Append the CLAUDE.md addendum (idempotent).**
   - Check whether a file named `CLAUDE.md` exists at the project root (Read).
   - The idempotency marker is the literal heading `## Working with claude-create`.
   - The addendum body lives in the plugin at `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md-addendum.md`. Read it from there.
   - If `CLAUDE.md` does not exist: Write a new file with the addendum body.
   - If `CLAUDE.md` exists and does NOT contain the marker heading: append the addendum body (separated by a blank line) using Edit or by reading + writing the concatenated contents.
   - If `CLAUDE.md` exists and already contains the marker heading: skip — report "already configured".

4. **Verify MCP connectivity.** Call `cc_get_status`. On a fresh repo the expected response is `No tickets found.` — that confirms the server is reachable.

5. **Report the checklist.** Print a summary with a check mark for each step, e.g.:
   ```
   ✓ Labels: X created, Y already existed
   ✓ Created docs/issues/
   ✓ Created docs/visions/
   ✓ CLAUDE.md addendum: appended (or: already present, skipped)
   ✓ MCP connectivity: ok
   ```
   Then tell the user they can run `/cc-brainstorm` to shape their first feature.

## Rules

- Do not edit other sections of the user's `CLAUDE.md`.
- Do not run any ticket-lifecycle tool here — this is bootstrap only.
- If `cc_ensure_labels` fails (missing `GITHUB_TOKEN`, wrong remote), report the error clearly and stop.
