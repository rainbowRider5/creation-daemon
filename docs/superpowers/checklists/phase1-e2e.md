# Phase 1 E2E Verification Checklist

Run this checklist against a disposable GitHub test repo after tagging a Phase 1 release.

## Prerequisites

- `GITHUB_TOKEN` set in the shell environment (scope: `repo`).
- A scratch GitHub repo named something like `<user>/creation-daemon-phase1-e2e` with at least one initial commit.
- Claude Code installed and updated to a version that supports plugin install from git URL.

## Steps

```
[ ] Plugin installs cleanly from git URL at the Phase 1 release tag
[ ] `/mcp` inside Claude Code shows cd-server connected with 11 tools listed
[ ] /cd-init creates 11 cd:* labels, docs/issues/, docs/visions/, and appends the CLAUDE.md addendum
[ ] /cd-init is idempotent: second run reports "already configured" and does not duplicate the addendum
[ ] /cd-brainstorm "toy feature" produces docs/visions/<slug>.md and ≥2 draft tickets on GitHub
[ ] /cd-refine #N writes docs/issues/N/002-refinement.md and swaps the label draft → refined
[ ] /cd-implement #N creates branch cc/N-<slug>, commits prefixed [cc#N], opens PR, label → in-review
[ ] /cd-review #N (approve path) approves PR; label transitions to done after merge
[ ] /cd-review #N (request-changes path) transitions label back to in-progress
[ ] /cd-adjust N "change X" appends commit to the PR branch and writes an adjustment artifact
[ ] /cd-improve scans src/ and creates at least one draft ticket
[ ] /cd-status renders tickets grouped by state in priority order
[ ] /cd-loop picks the highest-priority actionable ticket and dispatches to the correct sub-skill
[ ] cd_block_ticket posts the structured question comment to the issue
[ ] cd_unblock_check picks up a fresh non-bot reply and restores the ticket's previous state
```

Capture a screenshot or command output for each line before declaring Phase 1 done.
