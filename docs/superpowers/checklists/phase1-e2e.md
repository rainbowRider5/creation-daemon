# Phase 1 E2E Verification Checklist

Run this checklist against a disposable GitHub test repo after tagging a Phase 1 release.

## Prerequisites

- `GITHUB_TOKEN` set in the shell environment (scope: `repo`).
- A scratch GitHub repo named something like `<user>/claude-create-phase1-e2e` with at least one initial commit.
- Claude Code installed and updated to a version that supports plugin install from git URL.

## Steps

```
[ ] Plugin installs cleanly from git URL at the Phase 1 release tag
[ ] `/mcp` inside Claude Code shows cc-server connected with 11 tools listed
[ ] /cc-init creates 11 cc:* labels, docs/issues/, docs/visions/, and appends the CLAUDE.md addendum
[ ] /cc-init is idempotent: second run reports "already configured" and does not duplicate the addendum
[ ] /cc-brainstorm "toy feature" produces docs/visions/<slug>.md and ≥2 draft tickets on GitHub
[ ] /cc-refine #N writes docs/issues/N/002-refinement.md and swaps the label draft → refined
[ ] /cc-implement #N creates branch cc/N-<slug>, commits prefixed [cc#N], opens PR, label → in-review
[ ] /cc-review #N (approve path) approves PR; label transitions to done after merge
[ ] /cc-review #N (request-changes path) transitions label back to in-progress
[ ] /cc-adjust N "change X" appends commit to the PR branch and writes an adjustment artifact
[ ] /cc-improve scans src/ and creates at least one draft ticket
[ ] /cc-status renders tickets grouped by state in priority order
[ ] /cc-loop picks the highest-priority actionable ticket and dispatches to the correct sub-skill
[ ] cc_block_ticket posts the structured question comment to the issue
[ ] cc_unblock_check picks up a fresh non-bot reply and restores the ticket's previous state
```

Capture a screenshot or command output for each line before declaring Phase 1 done.
