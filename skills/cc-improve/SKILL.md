---
name: cc-improve
description: 'Scan the codebase for tech debt and create draft tickets for each finding'
allowed-tools:
  - mcp__cc-server__cc_create_ticket
  - Read
  - Grep
  - Glob
  - Bash
---

# Improve Scan

Scan the codebase for tech debt, code smells, missing tests, outdated dependencies, and security concerns. Create a draft ticket for each finding.

## Process

1. **Enumerate candidates.** Run these in parallel where possible:
   - `Grep -n "TODO|FIXME|XXX|HACK"` across the project.
   - Identify files over 300 lines (possible refactor candidates) via `Glob` + line counts.
   - Run `npm outdated` via Bash to find outdated dependencies.
   - Read the test directory — look for source files without matching tests.

2. **Triage.** Group findings. Drop trivial or resolved items. Keep findings that would be worth a single focused ticket.

3. **Investigate unclear findings (optional).** If a finding looks bug-like and you are unsure whether it is a real issue, apply `superpowers:systematic-debugging` when available to assess it before filing.

4. **Create tickets.** For each remaining finding, call `cc_create_ticket` with:
   - `title`: concrete, imperative (`"Replace TODO in src/github.ts line 47"`)
   - `body`: short problem statement + suggested approach + file references
   - `priority`: default `p3-low`, bump to `p2-medium` for broken tests or failing builds, `p1-high` for security or data-loss risk.

5. **Report summary.** Tell the user how many tickets were created and list their numbers + titles.

## Rules

- One finding per ticket — do not bundle.
- Do not fix anything in this skill — tickets only.
- Do not create duplicate tickets. If a similar draft ticket already exists (check with a grep over open issue titles if necessary), skip.
