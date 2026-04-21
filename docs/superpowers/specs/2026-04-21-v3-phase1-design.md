# V3 Phase 1: Plugin Packaging, Skills, and Bootstrap — Design Spec

## Overview

Phase 1 turns the Phase 0 MCP server into an installable Claude Code plugin. The entire repo becomes the plugin: `plugin.json`, `mcp.json`, and nine `cc-*` skills live at the root alongside the existing `src/` server source. The compiled `dist/` ships with the plugin on release tags. A `/cc-init` skill handles first-run setup (labels, directories, `CLAUDE.md`). The other eight skills orchestrate the ticket lifecycle and delegate process work (brainstorming, spec writing, TDD, review) to `superpowers:*` skills where available, with an inline fallback.

Phase 1 adds no new MCP tools — the server from Phase 0 is the contract. All new work is markdown + packaging.

### Key Decisions

| Decision                | Choice                                                                      | Rationale                                                                     |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Install shape           | Claude Code plugin at repo root                                             | Single install, native to Claude Code, self-contained                         |
| MCP server distribution | Bundled in plugin, launched from `${CLAUDE_PLUGIN_ROOT}/dist/src/server.js` | No separate npm install, zero runtime dependencies for user                   |
| Repo structure          | Repo root IS the plugin                                                     | Avoids a `plugin/` subfolder that duplicates source                           |
| `dist/` shipping        | Committed on release tags only                                              | Main stays clean; tag installs just work                                      |
| Skill prefix            | `cc-` on every skill (incl. `/cc-loop`)                                     | No collisions with superpowers or other plugins; consistent                   |
| Process delegation      | Thin skills delegate to superpowers with inline fallback                    | Zero duplication, works standalone                                            |
| First-run setup         | `/cc-init` skill                                                            | Explicit, auditable, idempotent, re-runnable                                  |
| Phase 1 scope           | All 9 skills                                                                | End-to-end round-trip is Phase 1's acceptance criterion                       |
| Verification            | Manual E2E checklist on a scratch test repo                                 | Skill behavior is not unit-testable; MCP tools already unit-tested in Phase 0 |

---

## Repository Structure

```
claude-create/
├── plugin.json                 # NEW — plugin manifest
├── mcp.json                    # NEW — MCP server launch config
├── skills/                     # NEW — 9 skill definitions
│   ├── cc-init/SKILL.md
│   ├── cc-brainstorm/SKILL.md
│   ├── cc-refine/SKILL.md
│   ├── cc-implement/SKILL.md
│   ├── cc-review/SKILL.md
│   ├── cc-adjust/SKILL.md
│   ├── cc-improve/SKILL.md
│   ├── cc-status/SKILL.md
│   └── cc-loop/SKILL.md
├── templates/
│   └── CLAUDE.md-addendum.md   # NEW — appended by /cc-init
├── src/                        # unchanged from Phase 0
├── dist/                       # gitignored on branches, force-added on release tags
├── tests/                      # unchanged from Phase 0
├── docs/
│   └── superpowers/specs/2026-04-21-v3-phase1-design.md  # this doc
├── package.json                # add `release` script
├── .gitignore                  # keeps dist/ ignored
├── README.md                   # updated with install instructions (post-design)
└── LICENSE
```

### Files Added in Phase 1

- `plugin.json`
- `mcp.json`
- `skills/cc-init/SKILL.md`
- `skills/cc-brainstorm/SKILL.md`
- `skills/cc-refine/SKILL.md`
- `skills/cc-implement/SKILL.md`
- `skills/cc-review/SKILL.md`
- `skills/cc-adjust/SKILL.md`
- `skills/cc-improve/SKILL.md`
- `skills/cc-status/SKILL.md`
- `skills/cc-loop/SKILL.md`
- `templates/CLAUDE.md-addendum.md`

### Files Modified in Phase 1

- `package.json` — add `release` script
- `README.md` — install + usage instructions for the plugin

### Files Unchanged in Phase 1

- All of `src/` — Phase 0 server is the contract
- All of `tests/` — existing unit tests stay green

---

## Plugin Manifests

### plugin.json

```json
{
  "name": "claude-create",
  "version": "0.1.0",
  "description": "Ticket-driven orchestration layer that turns Claude Code into an autonomous team",
  "author": { "name": "maciejdrzewiecki" },
  "license": "MIT"
}
```

### mcp.json

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

`${CLAUDE_PLUGIN_ROOT}` is the variable Claude Code substitutes with the plugin install directory. No `GITHUB_TOKEN` is set here — the MCP server reads it from the user's environment (documented in README).

---

## Skills

All skills follow the same structural pattern:

1. **Read context.** Call `cc_get_ticket` (single ticket) or `cc_list_tickets` / `cc_get_status` (board view).
2. **Delegate process where applicable.** If a relevant `superpowers:*` skill is available, invoke it with the ticket context; otherwise follow inline fallback instructions.
3. **Produce the artifact.** Call `cc_write_artifact` with the appropriate `type`.
4. **Transition state.** Call `cc_transition_state` to advance the label.
5. **Block if human input is required.** Call `cc_block_ticket` with a specific question.

### Frontmatter

Every `SKILL.md` starts with YAML frontmatter declaring `name`, `description`, and `allowed-tools`. The allowed-tools list names exactly the MCP tools + Claude Code built-ins that skill needs — principle of least privilege.

### Delegation pattern

Every skill body contains a block like:

```
If the `superpowers:<skill-name>` skill is available, invoke it to
<produce outcome>, passing the ticket body and prior artifacts as
context. Otherwise, follow the inline instructions below.
```

This lets the skill work standalone while opportunistically leveraging superpowers.

### Per-skill specification

#### `/cc-init`

- **Purpose:** One-shot bootstrap after plugin install.
- **Superpowers delegate:** none.
- **Allowed tools:** `mcp__cc-server__cc_ensure_labels`, `mcp__cc-server__cc_get_status`, Bash, Read, Write, Edit.
- **Steps:**
  1. Call `cc_ensure_labels`.
  2. Run `mkdir -p docs/issues docs/visions`.
  3. Read project `CLAUDE.md`. If the addendum marker (`## Working with claude-create`) is absent, append `templates/CLAUDE.md-addendum.md`. If `CLAUDE.md` does not exist, create it with the addendum body.
  4. Call `cc_get_status` to verify MCP connectivity (expected: "No tickets found." on fresh repo).
  5. Report a checklist of what was done.
- **Idempotency:** Every step is safe to re-run. Addendum append is guarded by marker check.

#### `/cc-brainstorm`

- **Purpose:** Turn a raw idea into a vision doc and 1–N draft tickets.
- **Superpowers delegate:** `superpowers:brainstorming`.
- **Allowed tools:** `mcp__cc-server__cc_create_ticket`, `mcp__cc-server__cc_write_artifact`, Bash, Edit, Write, Read.
- **Steps:**
  1. Delegate the collaborative brainstorming to `superpowers:brainstorming` if available; otherwise run an inline Socratic loop.
  2. Write the vision to `docs/visions/<slug>.md`.
  3. For each concrete deliverable, call `cc_create_ticket` (priority defaults `p2-medium`; note `Depends on: #X` for sequencing).
  4. Report the vision path + created ticket numbers.

#### `/cc-refine N`

- **Purpose:** Move ticket N from `draft` to `refined` by producing a spec artifact.
- **Superpowers delegate:** `superpowers:writing-plans`.
- **Allowed tools:** `mcp__cc-server__cc_get_ticket`, `mcp__cc-server__cc_write_artifact`, `mcp__cc-server__cc_transition_state`, `mcp__cc-server__cc_block_ticket`, Read, Grep, Glob.
- **Steps:**
  1. `cc_get_ticket` to load issue + existing artifacts.
  2. Examine codebase (Read/Grep/Glob) to ground the spec in current state.
  3. Delegate spec drafting to `superpowers:writing-plans` with the ticket + current state as context; otherwise use inline template (Goal / Current State / Approach / Files to Change / Acceptance Criteria / Open Questions).
  4. `cc_write_artifact` with `type: "refinement"`.
  5. `cc_transition_state` to `refined` — unless there are open architectural questions, in which case `cc_block_ticket` with the question.

#### `/cc-implement N`

- **Purpose:** Move ticket N from `ready` to `in-review` by producing an implementation and opening a PR.
- **Superpowers delegate:** `superpowers:test-driven-development` and `superpowers:executing-plans`.
- **Allowed tools:** `mcp__cc-server__cc_get_ticket`, `mcp__cc-server__cc_write_artifact`, `mcp__cc-server__cc_transition_state`, `mcp__cc-server__cc_block_ticket`, Bash, Read, Edit, Write, Glob, Grep.
- **Steps:**
  1. `cc_get_ticket` to load spec + artifacts.
  2. `cc_transition_state` to `in-progress`.
  3. Create branch `cc/<N>-<slug>` via Bash (`git checkout -b ...`).
  4. Delegate implementation to `superpowers:executing-plans` using the refinement artifact as the plan; use `superpowers:test-driven-development` for any new code.
  5. Commit with `[cc#N]` prefix.
  6. Push and `gh pr create` (via the server's `createPR` tool surface — see note).
  7. `cc_write_artifact` with `type: "implementation"`.
  8. `cc_transition_state` to `in-review`.
  9. If blocked (failing tests, unclear spec), `cc_block_ticket`.

Note: Phase 0's `src/github.ts` exports `createPR` but it is not currently exposed as an MCP tool. Phase 1 uses the skill to invoke `gh pr create` directly via Bash (the skill has Bash access). Elevating PR creation to an MCP tool is deferred to Phase 2 if needed.

#### `/cc-review N`

- **Purpose:** Review the PR for ticket N and either approve (→ `done` on merge) or request changes (→ `in-progress`).
- **Superpowers delegate:** `superpowers:receiving-code-review` for the reviewer lens (apply rigor, verify claims).
- **Allowed tools:** `mcp__cc-server__cc_get_ticket`, `mcp__cc-server__cc_write_artifact`, `mcp__cc-server__cc_transition_state`, Bash, Read, Grep, Glob.
- **Steps:**
  1. `cc_get_ticket` to load spec + artifacts.
  2. `gh pr diff <pr>` via Bash to get the change set.
  3. Compare diff against refinement artifact's acceptance criteria.
  4. Apply rigor via `superpowers:receiving-code-review` perspective.
  5. `cc_write_artifact` with `type: "review"`.
  6. If approved: `gh pr review --approve`; state transitions to `done` when the PR merges. If changes requested: `gh pr review --request-changes` + `cc_transition_state` back to `in-progress`.

#### `/cc-adjust N "feedback"`

- **Purpose:** Apply a delta to ticket N's in-progress branch.
- **Superpowers delegate:** none (free-form tweak).
- **Allowed tools:** `mcp__cc-server__cc_get_ticket`, `mcp__cc-server__cc_write_artifact`, Bash, Read, Edit, Write, Glob, Grep.
- **Steps:**
  1. `cc_get_ticket` to load current state.
  2. Check the ticket's branch is checked out (Bash).
  3. Make the change, commit `[cc#N] adjust: <summary>`.
  4. Push.
  5. `cc_write_artifact` with `type: "adjustment"`.

#### `/cc-improve`

- **Purpose:** Scan the codebase and create draft tickets for tech debt.
- **Superpowers delegate:** `superpowers:systematic-debugging` for any bug-like findings.
- **Allowed tools:** `mcp__cc-server__cc_create_ticket`, Read, Grep, Glob, Bash.
- **Steps:**
  1. Scan for TODO/FIXME, large files, missing tests, outdated deps (`npm outdated`).
  2. Group findings.
  3. For each finding, `cc_create_ticket` (priority `p3-low` unless critical).
  4. Report summary with ticket numbers created.

#### `/cc-status`

- **Purpose:** Show the board.
- **Superpowers delegate:** none.
- **Allowed tools:** `mcp__cc-server__cc_get_status`.
- **Steps:**
  1. `cc_get_status`.
  2. Render as-is (the server already formats it).

#### `/cc-loop`

- **Purpose:** One autonomous iteration: unblock, pick, dispatch.
- **Superpowers delegate:** reuses whatever the chosen sub-skill delegates to.
- **Allowed tools:** `mcp__cc-server__cc_unblock_check`, `mcp__cc-server__cc_pick_next_ticket`, `mcp__cc-server__cc_get_ticket`, `mcp__cc-server__cc_transition_state`, `mcp__cc-server__cc_write_artifact`, `mcp__cc-server__cc_block_ticket`, Bash, Read, Edit, Write, Glob, Grep.
- **Steps:**
  1. `cc_unblock_check` to promote any blocked tickets with fresh replies.
  2. `cc_pick_next_ticket`.
  3. If null: report "Nothing to do" and stop.
  4. Dispatch by state — `draft` runs the `/cc-refine` flow, `refined` approves to `ready` (or blocks), `ready` runs `/cc-implement`, `in-progress` resumes implementation, `in-review` runs `/cc-review`.
  5. Report action taken.

---

## First-run Bootstrap

### `templates/CLAUDE.md-addendum.md`

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
```

### `/cc-init` behaviour

Running `/cc-init` in a target project:

1. Calls `cc_ensure_labels` → creates any missing `cc:*` labels.
2. Runs `mkdir -p docs/issues docs/visions`.
3. Reads the project `CLAUDE.md`. If `## Working with claude-create` is not present, appends the addendum. If `CLAUDE.md` does not exist, creates it from the addendum body.
4. Calls `cc_get_status` to verify MCP reachability.
5. Prints a checklist.

Re-runs are safe — every step is idempotent.

---

## Build and Release

`dist/` stays gitignored on feature branches. On release we use npm's `version` lifecycle hook so `dist/` is staged before the commit is created, which means the tag points to a commit that already contains `dist/`.

1. `npm run release` runs:
   - `npm version patch` — bumps semver in `package.json`.
   - Before committing, npm runs the `version` lifecycle script (`npm run build && git add -f dist`) which compiles and force-stages `dist/`.
   - npm then commits `package.json` + staged `dist/` together and creates the tag on that commit.
   - `git push --follow-tags` publishes both the branch and the tag.
2. Users install by pointing Claude Code at a release tag; the tag contains `dist/` and everything works.

Earlier iterations used `git commit --amend --no-edit` to fold `dist/` into the version commit, but the tag created by `npm version` pointed at the pre-amend commit and was never moved — the pushed tag had no `dist/`. Using the `version` lifecycle hook avoids the amend entirely.

### package.json delta

Add two scripts:

```json
"version": "npm run build && git add -f dist",
"release": "npm version patch && git push --follow-tags"
```

### .gitignore

Keeps `dist/` ignored. Release script uses `-f` to bypass.

---

## End-to-End Verification

Phase 1 does not add automated integration tests. Skill behaviour lives inside Claude Code and is verified manually against a scratch GitHub test repo. The Phase 0 unit tests (`state-machine`, `priority`, `artifact-store`, `github`, `slug`) continue to run and must stay green.

### E2E checklist

Executed against a disposable GitHub repo (`<user>/claude-create-phase1-e2e`) by installing the plugin at the phase-1 release tag.

```
[ ] Plugin installs cleanly from git URL at a release tag
[ ] MCP server spawns; `/mcp` shows cc-server connected with 11 tools
[ ] /cc-init creates 11 labels, docs/issues/, docs/visions/, CLAUDE.md addendum
[ ] /cc-init is idempotent (second run reports "already configured")
[ ] /cc-brainstorm "toy feature" produces vision doc + 2 draft tickets on GitHub
[ ] /cc-refine #N writes refinement artifact, swaps label draft → refined
[ ] /cc-implement #N creates branch, commits prefixed [cc#N], opens PR, label → in-review
[ ] /cc-review #N (approve path) approves PR; label transitions to done on merge
[ ] /cc-review #N (request-changes path) transitions label back to in-progress
[ ] /cc-adjust #N "change X" appends commit, writes adjustment artifact
[ ] /cc-improve scans src/ and creates at least one draft ticket
[ ] /cc-status renders tickets grouped by state in priority order
[ ] /cc-loop picks highest-priority actionable ticket and dispatches the right sub-skill
[ ] cc_block_ticket posts structured comment; cc_unblock_check detects reply and restores state
```

Each line in the checklist is evidence that must be captured (screenshot or command output) before Phase 1 is declared done.

---

## Out of Scope for Phase 1

- GitHub Actions workflow for the persistent autonomous loop — Phase 2.
- npm publish of `claude-create` as a standalone package — not needed with bundled plugin.
- Elevating `gh pr create` and `gh pr review` into MCP tools — deferred; skills use Bash directly.
- Web dashboard, Slack/Discord notifications, multi-worktree concurrency — future phases.

---

## Risks and Open Questions

- **Plugin system maturity.** The `${CLAUDE_PLUGIN_ROOT}` variable and plugin install-from-git flow must work on the user's Claude Code version. Mitigation: document minimum Claude Code version in README.
- **Release workflow ergonomics.** The release uses npm's `version` lifecycle hook to stage `dist/` before the version commit so the tag points to a commit containing the compiled output. This is unconventional but keeps the release a single `npm run release` invocation.
- **Delegation detection.** Skills assume Claude can detect whether a `superpowers:*` skill is available. This is the standard skill-discovery behaviour; fallback path ensures safety if superpowers is absent.
