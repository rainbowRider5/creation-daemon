# E2E Scenario: `cd_archive_done` Lifecycle Walkthrough

Date: 2026-04-21

## Purpose

Define a single concrete, reproducible end-to-end scenario that drives one plausible feature through the full `/cd-*` lifecycle against the `creation-daemon` repo itself. The scenario doubles as:

1. Live verification that all nine `/cd-*` skills and the eleven `cd-server` MCP tools work together when chained.
2. A shipped feature (`cd_archive_done`) that the project actually wants.

This spec intentionally describes one scenario, not a test framework or a scenario matrix. Automated MCP-level E2E harness design is out of scope and deferred.

## Scope

**In scope:**

- A happy-path walkthrough that exercises `/cd-brainstorm`, `/cd-refine`, `/cd-loop`, `/cd-implement`, `/cd-adjust`, `/cd-review` (approve + merge completion), and `/cd-status`.
- Two side-branches that cover the remaining commands/tools: block/reply round trip and request-changes review path.
- Two nice-to-have side-branches: `/cd-improve` scan and `/cd-init` idempotency.
- The shipped feature itself: `cd_archive_done` MCP tool and `/cd-archive` skill wrapper.

**Out of scope:**

- Automated test harness for MCP stdio (no Vitest spawn-subprocess runner here).
- Scratch-repo or fixture-based determinism work.
- Feature additions beyond `cd_archive_done` and its supporting `cd:archived` label wiring.

## Side-Effect Notice

Executing this scenario on `creation-daemon` ships `cd_archive_done` for real: real GitHub issues, a real PR, a real merge on `main`. Do not run it as a rehearsal. If a rehearsal is wanted, fork to a scratch repo and rerun.

## The Feature

**`cd_archive_done`** — new MCP tool that closes GitHub issues currently in `cd:done` state older than a threshold (default **90 days**, set during `/cd-adjust` in step 5 below), applying a `cd:archived` label so state history is preserved. Wrapped by a `/cd-archive [days]` skill.

Design decision (resolved during `/cd-refine`): archiving both **closes** the GitHub issue and **applies** `cd:archived`. Closing removes the ticket from the active board; the label preserves audit trail.

### Code touchpoints

- `src/github.ts`: new `closeIssue(issueNumber)` function; extend the label set in `ensureLabels` to include `cd:archived`.
- `src/tools.ts`: register `cd_archive_done` tool. Input: `older_than_days: z.number().default(90)`. Returns count of archived tickets and their numbers.
- `src/tickets/state-machine.ts`: no state-machine change — `cd:archived` is an orthogonal marker, not a lifecycle state. Tickets remain in `cd:done` and gain `cd:archived` on top.
- `skills/cd-archive/SKILL.md`: new skill that reads optional `[days]` arg and calls `cd_archive_done`.
- `tests/archive-done.test.ts`: new Vitest file.

### Test cases (TDD order)

1. No `cd:done` tickets → returns count 0, no GitHub calls beyond the initial list.
2. `cd:done` ticket younger than threshold → not closed, not labeled.
3. `cd:done` ticket older than threshold → closed via `closeIssue`, labeled `cd:archived` via `updateLabels`.
4. Mix of younger + older → only older ones archived; returned count matches.

All GitHub calls mocked via `vi.mock('./github.js', …)` per existing test conventions in `tests/github.test.ts`.

## Happy-Path Walkthrough

Each step lists: **command → expected effect → verification**. Ticket number `<n>` is assigned at brainstorm time and propagated forward.

**Step 1. `/cd-brainstorm "a tool for pruning old done tickets from the board"`**

- Vision doc written at `docs/visions/archive-done-tickets.md`.
- ≥ 2 draft issues created via `cd_create_ticket`. At minimum: the archive tool itself, and a supporting ticket (e.g., "add `cd:archived` label to `ensureLabels`"). All with `cd:draft` + `cd:p2-medium`.
- Verify: `gh issue list --label cd:draft`, vision file exists.

**Step 2. `/cd-refine <n>`** (main archival ticket)

- `cd_write_artifact` produces `docs/issues/<n>/002-refinement.md` that resolves the "close vs label vs both" design question with **both**.
- `cd_transition_state` flips `cd:draft → cd:refined`.
- Verify: artifact file exists, `gh issue view <n>` shows the label swap.

**Step 3. `/cd-loop`**

- `cd_pick_next_ticket` returns `<n>` (highest-priority actionable with no remaining Open Questions).
- Loop transitions `refined → ready`, dispatches to `/cd-implement <n>`.
- Verify: label briefly `cd:ready`, then `cd:in-progress` once implement dispatches.

**Step 4. `/cd-implement <n>`**

- Branch `cd/<n>-archive-done-tickets` created off `main`.
- TDD-first:
  1. `tests/archive-done.test.ts` written with the four cases above — confirm failing.
  2. `src/github.ts` gains `closeIssue`; `ensureLabels` label set extended.
  3. `src/tools.ts` registers `cd_archive_done`.
  4. `skills/cd-archive/SKILL.md` created.
- Commits prefixed `[cd#<n>]`. `npm run lint:fix` + `npm run test` green before PR opens.
- PR opened via `gh pr create`; label `cd:in-progress → cd:in-review`.
- Verify: `gh pr view`, branch exists, `docs/issues/<n>/meta.json` has `branch` and `pr` set.

**Step 5. `/cd-adjust <n> "default should be 90 days, not 30 — we don't archive that aggressively"`**

- Skill finds branch via `git branch --list cd/<n>-*`, checks out, changes `.default(30)` to `.default(90)` in `tools.ts` plus the corresponding test expectation.
- Commits `[cd#<n>] adjust: default to 90 days`, pushes.
- `cd_write_artifact` writes `docs/issues/<n>/004-adjustment.md`.
- Verify: new commit on the PR, adjustment artifact exists.

**Step 6. `/cd-review <n>` — approve path**

- Review artifact `docs/issues/<n>/005-review.md`.
- `gh pr review --approve` posted.
- Skill output says "merge the PR, then re-run `/cd-review <n>` to finalize."
- Verify: PR state is APPROVED, label still `cd:in-review`.

**Step 7. Manual `gh pr merge <n> --merge`, then `/cd-review <n>` again**

- Skill detects PR in MERGED state upfront, transitions `cd:in-review → cd:done`.
- Verify: `gh pr view` shows MERGED, issue closed, label is `cd:done`.

**Step 8. `/cd-status`**

- `cd_get_status` output groups by state in order: `blocked, in-review, in-progress, ready, refined, draft, done`.
- The just-merged ticket appears under **DONE**; any remaining supporting draft appears under **DRAFT**.
- Verify: section order matches `tools.ts` ordering constant.

## Side-Branches

### A — Block + reply round trip (core — replaces the auto-resolve in step 2)

This branch **replaces** the happy-path behavior of step 2: instead of auto-resolving the design question in the refinement artifact, the skill calls `cd_block_ticket(<n>, "Archive = close issue, apply cd:archived label, or both?")`.

- Label flips to `cd:blocked`; a structured comment is posted to the GH issue via `postComment`.
- `meta.json` shows `blocked: true`, `blockedQuestion: "..."`, `previousState: "refined"`.

A human replies to the GH comment with `"both"`.

Next `/cd-loop`:

- `cd_unblock_check` scans `cd:blocked` tickets, finds the non-bot reply via `getCommentsSince`, restores label to `cd:refined`.
- `meta.blocked` becomes `false`, `previousState` becomes `null`.
- Loop then proceeds into the step 3 flow.

Verify: comment body matches the `cd_block_ticket` template; after reply, `meta.json` reflects restoration and label is `cd:refined`.

### B — Request-changes path on a fresh follow-up ticket (core — runs after step 7)

After step 7, create a small follow-up ticket manually:

```
gh issue create --title "add --dry-run flag to cd_archive_done" --label cd:draft --label cd:p3-low
```

Run `/cd-refine` → `/cd-loop` → `/cd-implement` against this new ticket. On the resulting PR, run `/cd-review <n>` and take the **request-changes** branch: skill posts review comments, transitions label `cd:in-review → cd:in-progress`, writes a review artifact listing the requested changes. No merge — this only proves the rejection path transitions state correctly.

Verify: PR state `CHANGES_REQUESTED`; ticket label back at `cd:in-progress`.

### C — `/cd-improve` at the end (nice-to-have)

After step 8, run `/cd-improve`. Skill scans the now-expanded codebase (including the newly shipped `cd_archive_done`) and creates ≥ 1 draft ticket for something specific it spots.

Verify: at least one new `cd:draft` issue exists referencing a specific file under `src/`.

### D — `/cd-init` idempotency (nice-to-have)

Run `/cd-init` at any point after the initial setup is already done.

Verify: skill reports "already configured"; `gh label list` count unchanged; `CLAUDE.md` contains exactly one "Working with creation-daemon" section.

## Coverage Matrix

| `/cd-*` command                | Covered in step              |
| ------------------------------ | ---------------------------- |
| `/cd-init`                     | Prerequisite + side-branch D |
| `/cd-brainstorm`               | 1                            |
| `/cd-refine`                   | 2, plus side-branch B        |
| `/cd-implement`                | 4, plus side-branch B        |
| `/cd-review` (approve)         | 6, 7                         |
| `/cd-review` (request-changes) | side-branch B                |
| `/cd-adjust`                   | 5                            |
| `/cd-improve`                  | side-branch C                |
| `/cd-status`                   | 8                            |
| `/cd-loop`                     | 3, plus side-branch A        |

| MCP tool              | Covered in step                            |
| --------------------- | ------------------------------------------ |
| `cd_create_ticket`    | 1 (via brainstorm), side-branch B (manual) |
| `cd_list_tickets`     | 3, 8 (indirect via loop/status)            |
| `cd_get_ticket`       | 2, 4, 6 (skills read context)              |
| `cd_transition_state` | 2, 3, 4, 7, side-branch B                  |
| `cd_pick_next_ticket` | 3                                          |
| `cd_write_artifact`   | 2, 4, 5, 6                                 |
| `cd_read_artifacts`   | 6 (review reads prior artifacts)           |
| `cd_block_ticket`     | side-branch A                              |
| `cd_unblock_check`    | side-branch A                              |
| `cd_get_status`       | 8                                          |
| `cd_ensure_labels`    | Prerequisite (`/cd-init`)                  |

All nine `/cd-*` commands and all eleven MCP tools are exercised when steps 1–8 plus side-branches A and B are executed.

## Preconditions

- On `creation-daemon` `main`, working tree clean.
- `GITHUB_TOKEN` exported (scope: `repo`).
- `gh` CLI authenticated.
- Claude Code session launched from the repo root with the plugin installed at its latest tag.
- `/mcp` shows `cd-server` connected with 11 tools.

## Evidence to Capture

For each step and for side-branches A and B, capture one of:

- Screenshot of the GitHub issue / PR state after the step.
- Relevant CLI output: `gh issue view <n>`, `gh pr view <n>`, `git log --oneline <branch>`.
- Artifact file contents where written.

File evidence under `docs/superpowers/checklists/archive-done-e2e-evidence/` (create on first run). Declare the scenario passing only when every step and both core side-branches have captured evidence.

## Open Questions

None — all design decisions (close + label, 90-day default, evidence location) are resolved above.
