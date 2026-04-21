# `cd_archive_done` E2E Scenario — Runbook

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the E2E scenario in `docs/superpowers/specs/2026-04-21-e2e-scenarios-design.md` against the `creation-daemon` repo itself, shipping the `cd_archive_done` feature in the process and capturing evidence at every step.

**Architecture:** A human driver (you) runs `/cd-*` commands inside a Claude Code session launched from this repo's root. Each task below is one scenario step with: preconditions, the command to run, what to verify, and which evidence artifact to capture. The creation-daemon skills themselves perform the heavy lifting (TDD, branching, PR creation, review posting) inside tasks 5 and 6. Evidence files live under `docs/superpowers/checklists/archive-done-e2e-evidence/NN-<slug>.md` and are committed separately from the shipped feature.

**Tech Stack:** Claude Code with the installed `creation-daemon` plugin, `gh` CLI, `git`, Node.js 20+ (for the MCP server), GitHub.

---

## File Map

| File                                                                          | Responsibility                                               |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `docs/superpowers/checklists/archive-done-e2e-evidence/`                      | Directory for captured evidence files, one per scenario step |
| `docs/superpowers/checklists/archive-done-e2e-evidence/00-preconditions.md`   | Evidence that prerequisites are satisfied                    |
| `docs/superpowers/checklists/archive-done-e2e-evidence/01-brainstorm.md`      | Vision path + draft issue list output                        |
| `docs/superpowers/checklists/archive-done-e2e-evidence/02-refine-blocked.md`  | Block comment body + `meta.json` snapshot                    |
| `docs/superpowers/checklists/archive-done-e2e-evidence/03-loop-unblock.md`    | Unblock trace + state transitions                            |
| `docs/superpowers/checklists/archive-done-e2e-evidence/04-implement.md`       | `gh pr view`, `git log --oneline`, `meta.json`               |
| `docs/superpowers/checklists/archive-done-e2e-evidence/05-adjust.md`          | Adjustment commit + artifact snapshot                        |
| `docs/superpowers/checklists/archive-done-e2e-evidence/06-review-approve.md`  | `gh pr view` showing APPROVED                                |
| `docs/superpowers/checklists/archive-done-e2e-evidence/07-merge-finalize.md`  | `gh pr view` MERGED + final label                            |
| `docs/superpowers/checklists/archive-done-e2e-evidence/08-status.md`          | `cd_get_status` output                                       |
| `docs/superpowers/checklists/archive-done-e2e-evidence/09-request-changes.md` | Side-branch B evidence                                       |
| `docs/superpowers/checklists/archive-done-e2e-evidence/10-improve.md`         | Side-branch C evidence (optional)                            |
| `docs/superpowers/checklists/archive-done-e2e-evidence/11-init-idempotent.md` | Side-branch D evidence (optional)                            |
| `src/github.ts` (modified by skill)                                           | Gains `closeIssue`; `ensureLabels` learns `cd:archived`      |
| `src/tools.ts` (modified by skill)                                            | Registers `cd_archive_done` tool                             |
| `skills/cd-archive/SKILL.md` (new, by skill)                                  | `/cd-archive [days]` wrapper                                 |
| `tests/archive-done.test.ts` (new, by skill)                                  | TDD tests for `cd_archive_done`                              |

---

## Task 0: Preconditions

**Files:**

- Create: `docs/superpowers/checklists/archive-done-e2e-evidence/00-preconditions.md`

- [ ] **Step 1: Confirm working tree is clean on `main`**

Run: `git status --porcelain && git rev-parse --abbrev-ref HEAD`
Expected: empty `git status` output, followed by `main`.

- [ ] **Step 2: Confirm `GITHUB_TOKEN` is exported with `repo` scope**

Run: `gh auth status`
Expected: at least one line "Token scopes: … repo …". Abort if missing.

- [ ] **Step 3: Confirm `gh` sees this repo**

Run: `gh repo view --json nameWithOwner -q .nameWithOwner`
Expected: `rainbowRider5/creation-daemon` (or your fork).

- [ ] **Step 4: Launch Claude Code from repo root and verify MCP connectivity**

From the shell:

```bash
claude
```

Inside Claude Code:

```
/mcp
```

Expected: `cd-server` listed as connected with **11 tools**. Abort if not — see `docs/phase1-e2e-instructions.md` troubleshooting section.

- [ ] **Step 5: Create evidence directory and write preconditions evidence**

From a terminal (outside Claude Code):

```bash
mkdir -p docs/superpowers/checklists/archive-done-e2e-evidence
```

Create `docs/superpowers/checklists/archive-done-e2e-evidence/00-preconditions.md` with:

```markdown
# Preconditions (captured YYYY-MM-DD HH:MM)

- git status: clean, on main
- gh auth status: <paste relevant lines>
- gh repo view: <paste output>
- /mcp output: cd-server connected, 11 tools
```

- [ ] **Step 6: Commit preconditions evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/00-preconditions.md
git commit -m "e2e(archive-done): capture preconditions"
```

---

## Task 1: `/cd-brainstorm` — vision + draft tickets

**Files:**

- Create (via skill): `docs/visions/archive-done-tickets.md`
- Create (via skill): GitHub issues with `cd:draft` labels
- Create (manual): `docs/superpowers/checklists/archive-done-e2e-evidence/01-brainstorm.md`

- [ ] **Step 1: Run brainstorm inside Claude Code**

```
/cd-brainstorm "a tool for pruning old done tickets from the board"
```

- [ ] **Step 2: Verify vision doc exists**

From terminal:

```bash
ls -la docs/visions/archive-done-tickets.md
```

Expected: file exists. Record its path and first 20 lines in evidence.

- [ ] **Step 3: Verify at least two draft tickets were created**

```bash
gh issue list --label cd:draft --json number,title,labels
```

Expected: at least 2 issues. One should be the main archival tool; the other a supporting ticket. Record the main ticket number as `<n>` — you'll use it in every subsequent task.

- [ ] **Step 4: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/01-brainstorm.md` with:

```markdown
# Step 1 — /cd-brainstorm

Main ticket: #<n>
Vision: docs/visions/archive-done-tickets.md

## Draft tickets

<paste gh issue list output>

## Vision excerpt (first 20 lines)

<paste>
```

- [ ] **Step 5: Commit evidence (vision file committed as part of skill's own artifact work)**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/01-brainstorm.md
git commit -m "e2e(archive-done): capture /cd-brainstorm evidence"
```

---

## Task 2: `/cd-refine <n>` with block (side-branch A, replaces auto-resolve)

**Files:**

- Modify (via skill): GitHub issue `<n>` labels (draft → blocked)
- Create (via skill): GitHub comment on issue `<n>` with the structured question
- Create/update (via skill): `docs/issues/<n>/meta.json`
- Create (manual): `docs/superpowers/checklists/archive-done-e2e-evidence/02-refine-blocked.md`

- [ ] **Step 1: Run refine, instructing the skill to block on the design question**

In Claude Code:

```
/cd-refine <n>

The design question "archive = close issue, apply cd:archived label, or both?"
is not obvious from the draft — call cd_block_ticket with exactly that question
rather than auto-resolving it. This is a deliberate E2E exercise of the block path.
```

- [ ] **Step 2: Verify label transitioned to `cd:blocked`**

```bash
gh issue view <n> --json labels -q '.labels[].name'
```

Expected: `cd:blocked` present, `cd:draft` absent.

- [ ] **Step 3: Verify the block comment was posted**

```bash
gh issue view <n> --comments
```

Expected: a comment starting with `**I need your input to continue.**` containing the question text. Save the comment to evidence.

- [ ] **Step 4: Verify `meta.json` reflects the blocked state**

```bash
cat docs/issues/<n>/meta.json
```

Expected: `"blocked": true`, `"blockedQuestion": "Archive = close issue, apply cd:archived label, or both?"`, `"previousState": "refined"` (the skill transitions draft→refined first, then blocks).

- [ ] **Step 5: Reply to the GitHub comment as a human**

```bash
gh issue comment <n> --body "both — close the GH issue and apply cd:archived so history is preserved"
```

- [ ] **Step 6: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/02-refine-blocked.md` with the block comment body, the `meta.json` snapshot while blocked, and the human reply.

- [ ] **Step 7: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/02-refine-blocked.md
git commit -m "e2e(archive-done): capture /cd-refine block path evidence"
```

---

## Task 3: `/cd-loop` — unblock and dispatch

**Files:**

- Modify (via skill): GitHub issue `<n>` labels (blocked → refined → ready → in-progress)
- Update (via skill): `docs/issues/<n>/meta.json`
- Create (manual): `docs/superpowers/checklists/archive-done-e2e-evidence/03-loop-unblock.md`

- [ ] **Step 1: Run the loop inside Claude Code**

```
/cd-loop
```

- [ ] **Step 2: Verify `cd_unblock_check` restored the ticket**

```bash
gh issue view <n> --json labels -q '.labels[].name'
```

Expected: `cd:blocked` absent. Immediately after the loop the label should be one of `cd:refined`, `cd:ready`, or `cd:in-progress` depending on how far the loop got. Whichever it is, record it.

- [ ] **Step 3: Verify meta.json state**

```bash
cat docs/issues/<n>/meta.json
```

Expected: `"blocked": false`, `"blockedQuestion": null`, `"previousState": null`.

- [ ] **Step 4: Verify a refinement artifact exists**

```bash
cat docs/issues/<n>/002-refinement.md
```

Expected: file exists. Its content may or may not reference the "both" resolution directly, depending on whether the `/cd-refine` skill re-runs on unblock or merely restores state. Record whichever you observe.

- [ ] **Step 5: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/03-loop-unblock.md` documenting: the unblock trace (loop output), the new label after the loop, the meta.json snapshot, and the refinement artifact excerpt.

- [ ] **Step 6: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/03-loop-unblock.md
git commit -m "e2e(archive-done): capture unblock + loop evidence"
```

---

## Task 4: `/cd-implement <n>` — ship the feature

The heavy lifting happens inside the `/cd-implement` skill. Your job in this task is to run it and verify what it produced.

**Files (all created or modified by the skill):**

- Create: `tests/archive-done.test.ts`
- Modify: `src/github.ts`
- Modify: `src/tools.ts`
- Create: `skills/cd-archive/SKILL.md`
- Create: `docs/issues/<n>/003-implementation.md`
- Update: `docs/issues/<n>/meta.json`
- Branch: `cd/<n>-archive-done-tickets`
- PR: opened against `main`

**Files (manual):**

- Create: `docs/superpowers/checklists/archive-done-e2e-evidence/04-implement.md`

- [ ] **Step 1: Run implement inside Claude Code**

```
/cd-implement <n>
```

If the loop in Task 3 already dispatched implement and the PR exists, the skill should recognize that state and either resume or report completion rather than start from scratch.

- [ ] **Step 2: Verify the branch exists**

From terminal:

```bash
git fetch origin
git branch --list "cd/<n>-*" -r
```

Expected: a remote branch `origin/cd/<n>-archive-done-tickets` (or similar slug).

- [ ] **Step 3: Verify commits are prefixed `[cd#<n>]`**

```bash
git log origin/cd/<n>-archive-done-tickets --oneline -- src/ tests/ skills/
```

Expected: at least three commits, all starting with `[cd#<n>]`. Record the list.

- [ ] **Step 4: Verify test suite is green on the branch**

```bash
git checkout cd/<n>-archive-done-tickets
npm ci
npm run test
```

Expected: all tests pass, including the new `tests/archive-done.test.ts` with the four cases from the spec.

- [ ] **Step 5: Verify `cd_archive_done` is registered**

```bash
git grep -n "cd_archive_done" src/
```

Expected: appears in `src/tools.ts` registration block.

- [ ] **Step 6: Verify `closeIssue` exists and `ensureLabels` covers `cd:archived`**

```bash
git grep -n "closeIssue\|cd:archived" src/github.ts
```

Expected: both symbols appear.

- [ ] **Step 7: Verify skill file exists**

```bash
cat skills/cd-archive/SKILL.md
```

Expected: skill with frontmatter including `name: cd-archive` and `allowed-tools: [mcp__cd-server__cd_archive_done]`.

- [ ] **Step 8: Verify PR is open and `cd:in-review` is applied**

```bash
gh pr view <prnum> --json state,isDraft,headRefName,labels
gh issue view <n> --json labels -q '.labels[].name'
```

Expected: PR `state: OPEN`, `isDraft: false`, head ref `cd/<n>-archive-done-tickets`. Issue label `cd:in-review`.

- [ ] **Step 9: Switch back to main and write evidence file**

```bash
git checkout main
```

Create `docs/superpowers/checklists/archive-done-e2e-evidence/04-implement.md` with: branch name, commit list, test run output tail (last 20 lines), `gh pr view` JSON, `meta.json` snapshot showing `branch` and `pr` fields set.

- [ ] **Step 10: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/04-implement.md
git commit -m "e2e(archive-done): capture /cd-implement evidence"
```

---

## Task 5: `/cd-adjust <n>` — default 30 → 90 days

**Files (via skill):**

- Modify (on `cd/<n>-archive-done-tickets`): `src/tools.ts` default value
- Modify (on branch): `tests/archive-done.test.ts` to match
- Create (on branch): `docs/issues/<n>/004-adjustment.md`

**Files (manual):**

- Create: `docs/superpowers/checklists/archive-done-e2e-evidence/05-adjust.md`

- [ ] **Step 1: Run adjust inside Claude Code**

```
/cd-adjust <n> "default should be 90 days, not 30 — we don't archive that aggressively"
```

- [ ] **Step 2: Verify a new commit landed on the PR branch**

From terminal:

```bash
git fetch origin
git log origin/cd/<n>-archive-done-tickets --oneline -5
```

Expected: most recent commit starts with `[cd#<n>] adjust:` and references the 90-day default.

- [ ] **Step 3: Verify the code change**

```bash
git show origin/cd/<n>-archive-done-tickets -- src/tools.ts | grep -A 2 "older_than_days"
```

Expected: `.default(90)` visible.

- [ ] **Step 4: Verify the test expectation was updated to match**

```bash
git show origin/cd/<n>-archive-done-tickets -- tests/archive-done.test.ts | head -80
```

Expected: any test that references the default uses 90.

- [ ] **Step 5: Verify adjustment artifact exists**

```bash
git show origin/cd/<n>-archive-done-tickets -- docs/issues/<n>/004-adjustment.md
```

Expected: artifact describes the default change and why.

- [ ] **Step 6: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/05-adjust.md` with the adjust commit hash, the code diff, and the adjustment artifact content.

- [ ] **Step 7: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/05-adjust.md
git commit -m "e2e(archive-done): capture /cd-adjust evidence"
```

---

## Task 6: `/cd-review <n>` — approve path

**Files (via skill):**

- Create (on branch): `docs/issues/<n>/005-review.md`
- PR review via `gh pr review --approve`

**Files (manual):**

- Create: `docs/superpowers/checklists/archive-done-e2e-evidence/06-review-approve.md`

- [ ] **Step 1: Run review inside Claude Code**

```
/cd-review <n>
```

- [ ] **Step 2: Verify review state on the PR**

From terminal:

```bash
gh pr view <prnum> --json reviews -q '.reviews[-1].state'
```

Expected: `APPROVED`.

- [ ] **Step 3: Verify skill instructed next step**

The skill's terminal output should say something like: "PR approved. Merge the PR, then re-run `/cd-review <n>` to finalize." Record that line.

- [ ] **Step 4: Verify issue label is still `cd:in-review`**

```bash
gh issue view <n> --json labels -q '.labels[].name'
```

Expected: `cd:in-review` still present (NOT `cd:done` yet — finalization happens in Task 7).

- [ ] **Step 5: Verify review artifact exists on the branch**

```bash
git show origin/cd/<n>-archive-done-tickets -- docs/issues/<n>/005-review.md
```

Expected: artifact summarizes review decision.

- [ ] **Step 6: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/06-review-approve.md` with the PR review JSON, the skill's next-step instruction, the issue label state, and the review artifact content.

- [ ] **Step 7: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/06-review-approve.md
git commit -m "e2e(archive-done): capture /cd-review approve evidence"
```

---

## Task 7: Merge + `/cd-review <n>` finalization

**Files (via skill, on `main`):**

- Modify: GitHub issue `<n>` labels (`cd:in-review → cd:done`)
- Update: `docs/issues/<n>/meta.json`

**Files (manual):**

- Create: `docs/superpowers/checklists/archive-done-e2e-evidence/07-merge-finalize.md`

- [ ] **Step 1: Merge the PR**

From terminal:

```bash
gh pr merge <prnum> --merge --delete-branch
```

Expected: PR merged, branch deleted from remote. `--merge` (not `--squash`) preserves the `[cd#<n>]` commit history, which matches creation-daemon's convention.

- [ ] **Step 2: Pull main locally**

```bash
git checkout main
git pull origin main
```

- [ ] **Step 3: Re-run review inside Claude Code**

```
/cd-review <n>
```

- [ ] **Step 4: Verify the skill detected MERGED state and transitioned to `done`**

```bash
gh issue view <n> --json state,labels -q '{state: .state, labels: [.labels[].name]}'
```

Expected: `state: "CLOSED"`, labels include `cd:done`, exclude `cd:in-review`.

- [ ] **Step 5: Verify `cd_archive_done` now appears in `/mcp` output (new tool shipped)**

Inside Claude Code:

```
/mcp
```

Expected: `cd-server` shows **12 tools** now (was 11 before the merge — the server must be reloaded, which may require Claude Code restart since `dist/` only updates on release tags; this is an expected quirk and should be noted in evidence rather than blocking completion).

- [ ] **Step 6: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/07-merge-finalize.md` with: merge commit hash, post-merge `gh pr view`, post-finalize `gh issue view`, `/mcp` tool count observation.

- [ ] **Step 7: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/07-merge-finalize.md
git commit -m "e2e(archive-done): capture merge + finalize evidence"
```

---

## Task 8: `/cd-status`

**Files (manual):**

- Create: `docs/superpowers/checklists/archive-done-e2e-evidence/08-status.md`

- [ ] **Step 1: Run status inside Claude Code**

```
/cd-status
```

- [ ] **Step 2: Verify ordering and section contents**

Expected: sections appear in order `BLOCKED, IN-REVIEW, IN-PROGRESS, READY, REFINED, DRAFT, DONE` (empty sections omitted). The just-merged ticket appears under **DONE**. Any remaining supporting ticket from Task 1 appears under **DRAFT**.

- [ ] **Step 3: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/08-status.md` with the full status output.

- [ ] **Step 4: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/08-status.md
git commit -m "e2e(archive-done): capture /cd-status evidence"
```

---

## Task 9: Side-branch B — request-changes path (follow-up ticket)

Run this against a fresh small follow-up ticket to exercise the review rejection path.

**Files:**

- Create (via `gh`): a new GitHub issue
- Create (via skills): corresponding `docs/issues/<m>/` artifacts and branch
- Create (manual): `docs/superpowers/checklists/archive-done-e2e-evidence/09-request-changes.md`

- [ ] **Step 1: Manually create a follow-up draft ticket**

```bash
gh issue create \
  --title "add --dry-run flag to cd_archive_done" \
  --body "When --dry-run is set, cd_archive_done should list what it would close without closing anything." \
  --label cd:draft --label cd:p3-low
```

Record the new ticket number as `<m>`.

- [ ] **Step 2: Refine the ticket**

In Claude Code:

```
/cd-refine <m>
```

Expected: `cd:draft → cd:refined`, refinement artifact written. No open questions expected for something this small.

- [ ] **Step 3: Loop and implement**

```
/cd-loop
```

This should pick `<m>` and eventually dispatch `/cd-implement <m>`. If the loop does not reach implement, run it explicitly:

```
/cd-implement <m>
```

Expected: new branch `cd/<m>-*`, PR opened, `cd:in-review` label.

- [ ] **Step 4: Run review — request-changes path**

```
/cd-review <m>

Request changes rather than approve. This is a deliberate E2E exercise of the
rejection path. Invent any reasonable concern (e.g. "tests don't cover the
case where every ticket is younger than the threshold").
```

- [ ] **Step 5: Verify PR is in `CHANGES_REQUESTED`**

From terminal:

```bash
gh pr view <prnum-m> --json reviews -q '.reviews[-1].state'
```

Expected: `CHANGES_REQUESTED`.

- [ ] **Step 6: Verify ticket label flipped back to `cd:in-progress`**

```bash
gh issue view <m> --json labels -q '.labels[].name'
```

Expected: `cd:in-progress` present, `cd:in-review` absent.

- [ ] **Step 7: Verify review artifact lists the requested changes**

```bash
git fetch origin
git show origin/cd/<m>-*:docs/issues/<m>/005-review.md
```

Expected: artifact enumerates the requested changes.

- [ ] **Step 8: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/09-request-changes.md` with: new ticket number, PR number, `gh pr view` review state, issue label state, review artifact excerpt.

- [ ] **Step 9: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/09-request-changes.md
git commit -m "e2e(archive-done): capture /cd-review request-changes evidence"
```

**Do not** merge ticket `<m>` or advance it further — its purpose is demonstrating the rejection path. Leave it at `cd:in-progress` for the scenario.

---

## Task 10 (optional): Side-branch C — `/cd-improve` scan

**Files (manual):**

- Create: `docs/superpowers/checklists/archive-done-e2e-evidence/10-improve.md`

- [ ] **Step 1: Run improve inside Claude Code**

```
/cd-improve
```

- [ ] **Step 2: Verify at least one new `cd:draft` ticket was created**

```bash
gh issue list --label cd:draft --search "created:>2026-04-21" --json number,title,body
```

Expected: at least one new draft. Its body should reference a specific file under `src/` (e.g. `src/tools.ts` around the newly added `cd_archive_done`).

- [ ] **Step 3: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/10-improve.md` with the new ticket number(s), title(s), and the file reference from the body.

- [ ] **Step 4: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/10-improve.md
git commit -m "e2e(archive-done): capture /cd-improve evidence"
```

---

## Task 11 (optional): Side-branch D — `/cd-init` idempotency

**Files (manual):**

- Create: `docs/superpowers/checklists/archive-done-e2e-evidence/11-init-idempotent.md`

- [ ] **Step 1: Capture baseline label count**

```bash
gh label list --search "cd:" --json name | jq 'length' > /tmp/cd-labels-before.txt
cat /tmp/cd-labels-before.txt
```

- [ ] **Step 2: Capture baseline CLAUDE.md addendum count**

```bash
grep -c "Working with creation-daemon" CLAUDE.md
```

Expected: `1`.

- [ ] **Step 3: Re-run init inside Claude Code**

```
/cd-init
```

Expected: skill prints something like "already configured — no changes made".

- [ ] **Step 4: Re-check counts**

```bash
gh label list --search "cd:" --json name | jq 'length'
grep -c "Working with creation-daemon" CLAUDE.md
```

Expected: both values unchanged from Steps 1 and 2.

- [ ] **Step 5: Write evidence file**

Create `docs/superpowers/checklists/archive-done-e2e-evidence/11-init-idempotent.md` with: label count before/after, addendum count before/after, skill output.

- [ ] **Step 6: Commit evidence**

```bash
git add docs/superpowers/checklists/archive-done-e2e-evidence/11-init-idempotent.md
git commit -m "e2e(archive-done): capture /cd-init idempotency evidence"
```

---

## Completion Criteria

The scenario is complete when:

- Tasks 0 through 8 are all checked off.
- Task 9 is checked off (side-branch B is part of the core scenario).
- Evidence files `00-preconditions.md` through `09-request-changes.md` are committed on `main`.
- `cd_archive_done` ships on `main` via the Task 7 merge.
- Ticket `<n>` is `cd:done` and closed on GitHub.
- Ticket `<m>` is `cd:in-progress` with a `CHANGES_REQUESTED` PR (unmerged) on GitHub.

Tasks 10 and 11 are optional. If skipped, note in a final summary evidence line.

## Rollback

If any step fails and cannot be repaired, do not attempt to hide the failure:

1. Record the failure in the relevant evidence file under a `## Failure` heading.
2. Commit the partial evidence.
3. Either open a bug ticket via `/cd-improve` referencing the failing step, or file it manually on `creation-daemon`.
4. If the failure is mid-implementation (branch exists but PR unmerged), leave the branch and PR in place — do not force-delete. A human can decide what to do.
