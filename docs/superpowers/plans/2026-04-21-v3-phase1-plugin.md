# V3 Phase 1: Plugin Packaging, Skills, and Bootstrap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 0 MCP server into an installable Claude Code plugin with 9 `cc-*` skills, first-run bootstrap via `/cc-init`, and a committed-dist release workflow.

**Architecture:** The repo root IS the plugin. `plugin.json` and `mcp.json` at the root alongside existing `src/` server source. `skills/` holds nine `SKILL.md` files; `templates/CLAUDE.md-addendum.md` holds the text appended to consumer projects. The compiled `dist/` is gitignored on feature branches and force-committed on release tags. Skills are thin orchestration — they delegate process work (brainstorming, spec writing, TDD, review) to `superpowers:*` skills when available, with an inline fallback.

**Tech Stack:** Markdown, JSON, YAML frontmatter. No new TypeScript. Existing: Node.js 20+, TypeScript ESM, `@modelcontextprotocol/sdk`, Vitest.

---

## File Map

| File                                        | Responsibility                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `plugin.json`                               | Claude Code plugin manifest (name, version, author, license)            |
| `mcp.json`                                  | MCP server launch config for Claude Code to run `cc-server`             |
| `.gitignore`                                | Ensure `dist/` stays ignored on feature branches                        |
| `package.json`                              | Add `release` script; no dependency changes                             |
| `templates/CLAUDE.md-addendum.md`           | Text appended to consumer project's `CLAUDE.md` by `/cc-init`           |
| `skills/cc-init/SKILL.md`                   | First-run bootstrap: labels, directories, CLAUDE.md, connectivity check |
| `skills/cc-brainstorm/SKILL.md`             | Vision doc + draft tickets from an idea                                 |
| `skills/cc-refine/SKILL.md`                 | Draft ticket → refined spec artifact + state transition                 |
| `skills/cc-implement/SKILL.md`              | Ready ticket → branch, code, PR, in-review state                        |
| `skills/cc-review/SKILL.md`                 | Review PR, write review artifact, approve or request changes            |
| `skills/cc-adjust/SKILL.md`                 | Apply feedback delta to in-progress branch                              |
| `skills/cc-improve/SKILL.md`                | Scan codebase → create tech-debt draft tickets                          |
| `skills/cc-status/SKILL.md`                 | Render the ticket board                                                 |
| `skills/cc-loop/SKILL.md`                   | One autonomous iteration: unblock → pick → dispatch to the right skill  |
| `docs/superpowers/checklists/phase1-e2e.md` | Manual E2E verification checklist                                       |
| `README.md`                                 | Rewritten for plugin install + command reference                        |

---

## Task 1: Plugin Manifest and MCP Config

**Files:**

- Create: `plugin.json`
- Create: `mcp.json`

- [ ] **Step 1: Create `plugin.json` at repo root**

```json
{
  "name": "claude-create",
  "version": "0.1.0",
  "description": "Ticket-driven orchestration layer that turns Claude Code into an autonomous team",
  "author": { "name": "maciejdrzewiecki" },
  "license": "MIT"
}
```

- [ ] **Step 2: Create `mcp.json` at repo root**

```json
{
  "mcpServers": {
    "cc-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/dist/src/server.js"]
    }
  }
}
```

- [ ] **Step 3: Verify both parse as JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('plugin.json')); JSON.parse(require('fs').readFileSync('mcp.json')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add plugin.json mcp.json
git commit -m "feat: add plugin.json and mcp.json for Claude Code plugin install"
```

---

## Task 2: Gitignore and package.json Release Script

**Files:**

- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Read current .gitignore**

Run: `cat .gitignore`
Note whether `dist/` is already listed. If present, skip Step 2.

- [ ] **Step 2: Ensure `dist/` is in .gitignore**

If not already present, append:

```
dist/
```

- [ ] **Step 3: Read current package.json**

Run: `cat package.json`
Note the exact position of the `scripts` block.

- [ ] **Step 4: Add `release` script to package.json**

In the `scripts` object, add one entry (preserve existing scripts and their order):

```json
"release": "npm version patch && npm run build && git add -f dist && git commit --amend --no-edit && git push --follow-tags"
```

- [ ] **Step 5: Verify package.json still parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 6: Verify scripts list**

Run: `node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('package.json')).scripts))"`
Expected: Array includes `"release"` alongside existing scripts.

- [ ] **Step 7: Verify build still works (unchanged behavior)**

Run: `npm run build`
Expected: TypeScript compiles without error; `dist/src/server.js` exists.

- [ ] **Step 8: Confirm dist/ is untracked**

Run: `git status --short dist/`
Expected: Empty output (dist/ is gitignored).

- [ ] **Step 9: Commit**

```bash
git add .gitignore package.json
git commit -m "build: add release script and keep dist/ gitignored on branches"
```

---

## Task 3: CLAUDE.md Addendum Template

**Files:**

- Create: `templates/CLAUDE.md-addendum.md`

- [ ] **Step 1: Create the addendum file**

Write the exact contents below to `templates/CLAUDE.md-addendum.md`:

```markdown
## Working with claude-create

This project uses claude-create for ticket-driven development.

- Tickets are GitHub issues labeled `cc:*` (state + priority)
- Artifacts live in `docs/issues/<n>/` (drafts, refinements, reviews)
- Visions live in `docs/visions/<slug>.md`

### Commands

- `/cc-brainstorm <idea>` — shape an idea into a vision + draft tickets
- `/cc-refine <n>` — turn a draft into an approved spec
- `/cc-implement <n>` — implement a ready ticket on a branch
- `/cc-review <n>` — review the PR for a ticket
- `/cc-adjust <n> "feedback"` — apply a change to an in-progress branch
- `/cc-improve` — scan the codebase and create tech-debt tickets
- `/cc-status` — show the current board
- `/cc-loop` — process the next actionable ticket

### Conventions

- Commits on ticket branches are prefixed `[cc#<n>]`
- Branch names follow `cc/<n>-<slug>`
- Priority defaults to `cc:p2-medium`
- The idempotency marker for `/cc-init` is the `## Working with claude-create` heading — do not rename it.
```

- [ ] **Step 2: Verify marker heading matches what /cc-init checks**

Run: `head -1 templates/CLAUDE.md-addendum.md`
Expected: `## Working with claude-create`

- [ ] **Step 3: Commit**

```bash
git add templates/CLAUDE.md-addendum.md
git commit -m "docs: add CLAUDE.md addendum template for /cc-init"
```

---

## Task 4: Skill — `/cc-init`

**Files:**

- Create: `skills/cc-init/SKILL.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p skills/cc-init`

- [ ] **Step 2: Write `skills/cc-init/SKILL.md`**

````markdown
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
````

- [ ] **Step 3: Verify frontmatter parses (sanity check)**

Run: `head -12 skills/cc-init/SKILL.md`
Expected: Lines 1–11 match the frontmatter block above exactly.

- [ ] **Step 4: Commit**

```bash
git add skills/cc-init/SKILL.md
git commit -m "feat(skills): add /cc-init bootstrap skill"
```

---

## Task 5: Skill — `/cc-brainstorm`

**Files:**

- Create: `skills/cc-brainstorm/SKILL.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p skills/cc-brainstorm`

- [ ] **Step 2: Write `skills/cc-brainstorm/SKILL.md`**

````markdown
---
name: cc-brainstorm
description: 'Collaborative brainstorming session that produces a vision doc in docs/visions/ and draft tickets on GitHub labeled cc:draft'
allowed-tools:
  - mcp__cc-server__cc_create_ticket
  - mcp__cc-server__cc_write_artifact
  - Bash
  - Read
  - Write
  - Edit
---

# Brainstorm Session

You are running an interactive brainstorming session with the user about: $ARGUMENTS

## Process

1. **Shape the idea collaboratively.**
   - If the `superpowers:brainstorming` skill is available, invoke it to run the collaborative design flow, passing the user's topic as input. Follow its questions and design approval gates.
   - Otherwise, run an inline Socratic loop: ask purpose, constraints, success criteria one question at a time; propose 2-3 approaches with trade-offs; present a design and get approval.

2. **Write the vision doc.** Once the design is approved, write it to `docs/visions/<slug>.md` where `<slug>` is a short kebab-case name derived from the topic. Use this format:

   ```markdown
   # <Title>

   ## Problem

   What problem does this solve?

   ## Solution

   High-level approach.

   ## Tickets

   - #<n> — <title>
   - #<n> — <title>
   ```

   Fill in the ticket numbers in Step 4 after creating them.

3. **Decompose into tickets.** Break the vision into discrete deliverables that each fit in one implementation session.

4. **Create draft tickets.** For each deliverable, call `cc_create_ticket` with:
   - `title`: concise imperative phrase
   - `body`: problem statement + acceptance criteria + (if applicable) `Depends on: #X` lines for sequencing
   - `priority`: defaults to `p2-medium` unless the user specifies otherwise

   Capture each returned issue number and update the vision doc's `## Tickets` section with the real numbers.

5. **Report back.** Tell the user the vision doc path and the list of created tickets.

## Rules

- Keep tickets small and independent where possible.
- Note dependencies using `Depends on: #X, #Y` in the ticket body — the scheduler parses this.
- Do not call any state-transition tool — new tickets start as `cc:draft`.
````

- [ ] **Step 3: Commit**

```bash
git add skills/cc-brainstorm/SKILL.md
git commit -m "feat(skills): add /cc-brainstorm skill"
```

---

## Task 6: Skill — `/cc-refine`

**Files:**

- Create: `skills/cc-refine/SKILL.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p skills/cc-refine`

- [ ] **Step 2: Write `skills/cc-refine/SKILL.md`**

````markdown
---
name: cc-refine
description: 'Refine a cc:draft ticket into a detailed spec artifact and transition it to cc:refined'
allowed-tools:
  - mcp__cc-server__cc_get_ticket
  - mcp__cc-server__cc_write_artifact
  - mcp__cc-server__cc_transition_state
  - mcp__cc-server__cc_block_ticket
  - Read
  - Grep
  - Glob
---

# Refine Ticket

Refine ticket #$ARGUMENTS into a detailed spec.

## Process

1. **Load context.** Call `cc_get_ticket` with `issue_number: $ARGUMENTS`. Read the issue body and any existing artifacts.

2. **Ground the spec in current state.** Use Read, Grep, and Glob to examine the parts of the codebase the ticket will touch. Note file paths and existing patterns.

3. **Produce the spec.**
   - If the `superpowers:writing-plans` skill is available, invoke it with the ticket body + codebase context as input and use its output as the spec.
   - Otherwise, write the spec yourself using this template:

     ```markdown
     # Refinement for #<n>: <title>

     ## Goal

     What this ticket accomplishes (one sentence).

     ## Current State

     What exists today, with exact file paths.

     ## Approach

     Step-by-step implementation plan.

     ## Files to Change

     - `path/to/file.ts` — what will change
     - …

     ## Acceptance Criteria

     - [ ] Testable item one
     - [ ] Testable item two

     ## Open Questions

     - Anything that needs human input before implementation.
     ```

4. **Write the artifact.** Call `cc_write_artifact` with:
   - `issue_number`: $ARGUMENTS
   - `type`: `refinement`
   - `content`: the spec you produced

5. **Decide the next state.**
   - If the spec has no unanswered architectural questions, call `cc_transition_state` with `new_state: refined`.
   - If there are open questions you cannot resolve from the codebase alone, call `cc_block_ticket` with a specific question. Do not transition to `refined` in that case.

## Rules

- Never guess at architectural decisions — ask via `cc_block_ticket`.
- Acceptance criteria must be testable (each item should correspond to a runnable assertion).
- Do not modify source code in this skill. Refinement is read-only.
````

- [ ] **Step 3: Commit**

```bash
git add skills/cc-refine/SKILL.md
git commit -m "feat(skills): add /cc-refine skill"
```

---

## Task 7: Skill — `/cc-implement`

**Files:**

- Create: `skills/cc-implement/SKILL.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p skills/cc-implement`

- [ ] **Step 2: Write `skills/cc-implement/SKILL.md`**

````markdown
---
name: cc-implement
description: 'Implement a cc:ready ticket: create a branch, write code (TDD), commit, open a PR, transition to cc:in-review'
allowed-tools:
  - mcp__cc-server__cc_get_ticket
  - mcp__cc-server__cc_write_artifact
  - mcp__cc-server__cc_transition_state
  - mcp__cc-server__cc_block_ticket
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

1. **Load context.** Call `cc_get_ticket` with `issue_number: $ARGUMENTS`. Read the refinement artifact (the approved spec) and note the acceptance criteria.

2. **Transition to in-progress.** Call `cc_transition_state` with `new_state: in-progress`.

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

6. **Write the implementation artifact.** Call `cc_write_artifact` with:
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

7. **Transition to in-review.** Call `cc_transition_state` with `new_state: in-review`.

## Rules

- Follow the refinement artifact. If the spec is wrong, call `cc_block_ticket` with the specific conflict rather than guessing.
- Every commit message starts with `[cc#$ARGUMENTS]`.
- Do not modify files outside the ticket's declared scope.
- All tests must pass locally before you push.
- If you hit an architectural uncertainty you cannot resolve, call `cc_block_ticket` — do not guess.
````

- [ ] **Step 3: Commit**

```bash
git add skills/cc-implement/SKILL.md
git commit -m "feat(skills): add /cc-implement skill"
```

---

## Task 8: Skill — `/cc-review`

**Files:**

- Create: `skills/cc-review/SKILL.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p skills/cc-review`

- [ ] **Step 2: Write `skills/cc-review/SKILL.md`**

````markdown
---
name: cc-review
description: 'Review the PR for a cc:in-review ticket, write a review artifact, then approve (→ cc:done on merge) or request changes (→ cc:in-progress)'
allowed-tools:
  - mcp__cc-server__cc_get_ticket
  - mcp__cc-server__cc_write_artifact
  - mcp__cc-server__cc_transition_state
  - Bash
  - Read
  - Grep
  - Glob
---

# Review Ticket

Review the PR for ticket #$ARGUMENTS.

## Process

1. **Load context.** Call `cc_get_ticket` with `issue_number: $ARGUMENTS`. Read the refinement artifact (spec) and implementation artifact.

2. **Find the PR.** The implementation artifact references the PR. If not, run `gh pr list --search "cc#$ARGUMENTS" --state open` via Bash to find it.

3. **Read the diff.** Run `gh pr diff <pr-number>` via Bash.

4. **Apply review rigor.**
   - If the `superpowers:receiving-code-review` skill is available, invoke it to apply review standards (verify claims, test coverage, edge cases).
   - Otherwise, check inline: does the diff satisfy each acceptance criterion? Are there untested edge cases? Any security, performance, or readability issues?

5. **Write the review artifact.** Call `cc_write_artifact` with:
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
   - **Changes requested:** run `gh pr review <pr-number> --request-changes --body "<summary>"` via Bash, then call `cc_transition_state` with `new_state: in-progress`.

## Rules

- Evidence before assertions — every verdict cites a file or line number.
- Do not modify source code in this skill. Review is read-only.
- If the PR is missing or not tied to this ticket, call `cc_block_ticket` with a clarification question.
````

- [ ] **Step 3: Commit**

```bash
git add skills/cc-review/SKILL.md
git commit -m "feat(skills): add /cc-review skill"
```

---

## Task 9: Skill — `/cc-adjust`

**Files:**

- Create: `skills/cc-adjust/SKILL.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p skills/cc-adjust`

- [ ] **Step 2: Write `skills/cc-adjust/SKILL.md`**

````markdown
---
name: cc-adjust
description: "Apply feedback or a small change to a cc:in-progress or cc:in-review ticket's branch — commit, push, write an adjustment artifact"
allowed-tools:
  - mcp__cc-server__cc_get_ticket
  - mcp__cc-server__cc_write_artifact
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

2. **Load context.** Call `cc_get_ticket` with the parsed issue number. Read the refinement artifact and any prior adjustments.

3. **Check out the ticket branch.** Run `git checkout cc/<issue-number>-<slug>` via Bash. The slug is recorded in the ticket's meta.json (from `cc_get_ticket`) or derivable from the title.

4. **Make the change.** Apply the feedback. Keep edits minimal and focused.

5. **Commit.** Run via Bash:

   ```
   git commit -am "[cc#<issue-number>] adjust: <short summary of feedback>"
   ```

6. **Push.** Run `git push` via Bash. This updates the open PR.

7. **Write the adjustment artifact.** Call `cc_write_artifact` with:
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

- Do not transition state. `/cc-adjust` leaves the ticket in whatever state it was in.
- Do not modify files outside the adjustment's scope.
- If the branch does not exist, the ticket is not in-progress — stop and tell the user.
````

- [ ] **Step 3: Commit**

```bash
git add skills/cc-adjust/SKILL.md
git commit -m "feat(skills): add /cc-adjust skill"
```

---

## Task 10: Skill — `/cc-improve`

**Files:**

- Create: `skills/cc-improve/SKILL.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p skills/cc-improve`

- [ ] **Step 2: Write `skills/cc-improve/SKILL.md`**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add skills/cc-improve/SKILL.md
git commit -m "feat(skills): add /cc-improve skill"
```

---

## Task 11: Skill — `/cc-status`

**Files:**

- Create: `skills/cc-status/SKILL.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p skills/cc-status`

- [ ] **Step 2: Write `skills/cc-status/SKILL.md`**

```markdown
---
name: cc-status
description: 'Show the current cc:* ticket board, grouped by state in priority order'
allowed-tools:
  - mcp__cc-server__cc_get_status
---

# Status Board

Show the current state of all cc:\* tickets.

## Process

1. Call `cc_get_status` with no arguments.
2. Return the tool's formatted output as-is. The server already groups and orders tickets.

## Rules

- Do not call any other tool.
- Do not re-format the server output beyond trivial presentation.
```

- [ ] **Step 3: Commit**

```bash
git add skills/cc-status/SKILL.md
git commit -m "feat(skills): add /cc-status skill"
```

---

## Task 12: Skill — `/cc-loop`

**Files:**

- Create: `skills/cc-loop/SKILL.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p skills/cc-loop`

- [ ] **Step 2: Write `skills/cc-loop/SKILL.md`**

```markdown
---
name: cc-loop
description: 'One autonomous iteration: unblock replied tickets, pick the next actionable ticket by priority, dispatch it to the matching cc-* skill'
allowed-tools:
  - mcp__cc-server__cc_unblock_check
  - mcp__cc-server__cc_pick_next_ticket
  - mcp__cc-server__cc_get_ticket
  - mcp__cc-server__cc_transition_state
  - mcp__cc-server__cc_write_artifact
  - mcp__cc-server__cc_block_ticket
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
---

# Autonomous Loop Iteration

Process the highest-priority actionable ticket.

## Process

1. **Unblock replied tickets.** Call `cc_unblock_check`. Any ticket that received a human reply since being blocked transitions back to its previous state.

2. **Pick the next ticket.** Call `cc_pick_next_ticket`. The server returns the highest-priority actionable ticket (state priority × priority label), or `No actionable tickets found.`.

3. **If nothing to do:** Report "Nothing to do" and stop.

4. **Dispatch by state.** Look at the ticket's current state:
   - `draft` → follow the `/cc-refine` process on this ticket.
   - `refined` → the user approves refined specs manually; call `cc_transition_state` to `ready` only if the refinement artifact has no `Open Questions`. Otherwise, call `cc_block_ticket` with the unanswered questions.
   - `ready` → follow the `/cc-implement` process.
   - `in-progress` → resume implementation (check out the branch, continue from the last commit).
   - `in-review` → follow the `/cc-review` process.
   - (`blocked` and `done` tickets are filtered out by `cc_pick_next_ticket`.)

5. **Report action taken.** One or two sentences: ticket number, what you did, what state it's in now.

## Rules

- Do exactly one action per invocation. The loop is designed for repeated calls, not a single-shot full pipeline.
- Never skip `cc_unblock_check`. A blocked ticket that got a reply becomes the highest priority in its restored state.
- If you are uncertain which sub-skill to apply, call `cc_block_ticket` with the uncertainty and stop — do not guess.
```

- [ ] **Step 3: Commit**

```bash
git add skills/cc-loop/SKILL.md
git commit -m "feat(skills): add /cc-loop autonomous iteration skill"
```

---

## Task 13: Update README with Plugin Install and Usage

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Read current README**

Run: `cat README.md`
Identify the sections that already exist (likely the v2 pitch) to decide what to replace vs append.

- [ ] **Step 2: Rewrite README around the plugin install flow**

The README must contain these sections in this order (replace or update existing content):

````markdown
# claude-create

Orchestration layer on top of Claude Code that turns a single developer into a team.

Tickets live on GitHub. Artifacts live in `docs/issues/<n>/`. Nine `/cc-*` slash commands drive the lifecycle. The autonomous loop pattern lets you fire-and-forget once tickets are refined.

## Prerequisites

- Claude Code with plugin-install-from-git support
- Node.js 20+
- `gh` CLI authenticated
- `GITHUB_TOKEN` in the shell environment (scope: `repo`)

## Install

```bash
# From inside any project with a GitHub remote:
claude code
/plugin install github:rainbowRider5/claude-create@v0.1.0
# restart or reload Claude Code
/cc-init
```

`/cc-init` creates the `cc:*` labels on your repo, sets up `docs/issues/` and `docs/visions/`, and appends a short section to your project's `CLAUDE.md`.

## Commands

| Command                 | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `/cc-init`              | One-shot setup: labels, dirs, CLAUDE.md           |
| `/cc-brainstorm <idea>` | Vision doc + draft tickets from a fuzzy idea      |
| `/cc-refine <n>`        | Draft → refined spec                              |
| `/cc-implement <n>`     | Ready → branch, code, PR, in-review               |
| `/cc-review <n>`        | Review the PR → approve or request changes        |
| `/cc-adjust <n> "note"` | Apply a delta to an in-progress branch            |
| `/cc-improve`           | Scan codebase → tech-debt draft tickets           |
| `/cc-status`            | Board view                                        |
| `/cc-loop`              | One autonomous iteration: unblock, pick, dispatch |

## Works well with

- [superpowers](https://github.com/obra/superpowers) — TDD, debugging, code review rigor. `cc-*` skills delegate process work to `superpowers:*` when installed.
- [impeccable](https://github.com/pbakaus/impeccable) — frontend design quality for UI tickets.

## Uninstall

```bash
/plugin uninstall claude-create
```

Your `docs/issues/` content and GitHub labels stay — remove them manually if you want a clean sweep.

## Development

This repo IS the plugin. `src/` is the MCP server source; `dist/` ships committed only on release tags. See `docs/superpowers/specs/` for design specs and `docs/superpowers/plans/` for implementation plans.
````

Replace the existing README content with the above. Do not preserve v2 CLI install instructions.

- [ ] **Step 3: Verify README renders sensibly**

Run: `head -40 README.md`
Expected: Starts with `# claude-create` and mentions `/plugin install`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for plugin install + commands"
```

---

## Task 14: E2E Verification Checklist

**Files:**

- Create: `docs/superpowers/checklists/phase1-e2e.md`

- [ ] **Step 1: Create directory**

Run: `mkdir -p docs/superpowers/checklists`

- [ ] **Step 2: Write `docs/superpowers/checklists/phase1-e2e.md`**

````markdown
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
````

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/checklists/phase1-e2e.md
git commit -m "docs: add Phase 1 E2E verification checklist"
```

---

## Task 15: Final Verification and Release Dry-Run

**Files:**

- No new files — validation only.

- [ ] **Step 1: Run existing Phase 0 unit tests**

Run: `npm run test`
Expected: All 46 tests pass (state-machine, priority, artifact-store, slug, github).

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Run lint:fix**

Run: `npm run lint:fix`
Expected: Clean or auto-fixed. If files change, commit:

```bash
git add -A
git commit -m "chore: lint fixes"
```

- [ ] **Step 4: Verify the plugin manifest + mcp.json**

Run: `node -e "const p=JSON.parse(require('fs').readFileSync('plugin.json')); const m=JSON.parse(require('fs').readFileSync('mcp.json')); if(p.name!=='claude-create') throw 'bad plugin name'; if(!m.mcpServers['cc-server']) throw 'missing cc-server'; console.log('ok')"`
Expected: `ok`

- [ ] **Step 5: Verify all 9 skill directories exist with a SKILL.md**

Run:

```bash
for s in cc-init cc-brainstorm cc-refine cc-implement cc-review cc-adjust cc-improve cc-status cc-loop; do
  test -f "skills/$s/SKILL.md" && echo "ok: $s" || echo "MISSING: $s"
done
```

Expected: 9 lines, all `ok: cc-*`.

- [ ] **Step 6: Verify the template exists**

Run: `test -f templates/CLAUDE.md-addendum.md && head -1 templates/CLAUDE.md-addendum.md`
Expected: `## Working with claude-create`

- [ ] **Step 7: Verify the MCP server still starts**

Run the Phase 0 smoke test:

```bash
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}' | node dist/src/server.js | head -c 400
```

Expected: JSON response containing `"name":"cc-server"`.

- [ ] **Step 8: Verify `dist/` is still untracked**

Run: `git status --short dist/`
Expected: Empty output — `dist/` stays ignored until a release.

- [ ] **Step 9: Dry-run the release script (without actually running it)**

Read the `release` script from `package.json` and confirm it matches:

```
npm version patch && npm run build && git add -f dist && git commit --amend --no-edit && git push --follow-tags
```

Do NOT execute it. Actual release is a separate manual step after merge.

- [ ] **Step 10: Final commit if anything changed**

```bash
git status
# If clean, nothing to commit. If not:
git add -A
git commit -m "chore: phase 1 verification fixes"
```

- [ ] **Step 11: Summary**

Report back to the user:

- Total tasks completed (should be 15).
- Total commits on the `phase-1-skills-and-setup` branch.
- Next step: run the E2E checklist at `docs/superpowers/checklists/phase1-e2e.md` on a scratch test repo, then merge.
