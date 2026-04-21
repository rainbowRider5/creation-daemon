# V3 Restructure: MCP Server + Skills Hybrid Architecture

## Overview

Restructure creation-daemon from a monolithic CLI (v2) to a hybrid architecture: MCP Server (orchestration brain) + Claude Code Skills (user-facing commands) + GitHub Actions (persistent loop). The MCP server is the core deliverable — skills and GitHub Actions come in later phases.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repo structure | Flat — `src/` is the MCP server | Single package, no monorepo complexity |
| V2 files | Clean sweep, port ~150 lines | Stubs have no value, clean start avoids v2 leakage |
| GitHub access | Hybrid — Octokit for CRUD, `gh` CLI for PRs | Type safety for core ops, convenience for PR workflows |
| Config | No config file — auto-detect from git remote | Zero setup friction, config easy to add later |
| Server structure | Domain modules + thin tool dispatch | Cohesive domain logic, minimal indirection |

---

## Repository Structure

```
creation-daemon/
├── package.json              # MCP server package
├── tsconfig.json
├── README.md
├── LICENSE
│
├── src/
│   ├── server.ts             # MCP server entry point (stdio transport)
│   ├── tools.ts              # Tool definitions + handler dispatch
│   │
│   ├── tickets/
│   │   ├── state-machine.ts  # States, transitions, validation
│   │   └── priority.ts       # Priority sorting + dependency resolution
│   │
│   ├── artifacts/
│   │   └── artifact-store.ts # Read/write/list artifacts + meta.json
│   │
│   ├── github.ts             # Octokit client + issue/label/comment CRUD + gh CLI for PRs
│   │
│   └── utils/
│       ├── slug.ts           # Ported from v2
│       └── git.ts            # Trimmed from v2 (parseGitHubRemote, getRemoteUrl)
│
├── tests/
│   ├── state-machine.test.ts
│   ├── priority.test.ts
│   ├── artifact-store.test.ts
│   ├── slug.test.ts          # Kept from v2
│   └── github.test.ts
│
├── skills/                   # Copied into target projects by cd-init (Phase 1)
│   ├── brainstorm/SKILL.md
│   ├── refine/SKILL.md
│   ├── implement/SKILL.md
│   ├── review/SKILL.md
│   ├── adjust/SKILL.md
│   ├── improve/SKILL.md
│   ├── status/SKILL.md
│   └── cd-loop/SKILL.md
│
├── templates/                # Phase 1-2
│   ├── github-action.yml
│   ├── mcp-config.json
│   └── CLAUDE.md
│
└── bin/
    └── cd-init.ts            # Only CLI command (Phase 1)
```

### Files Deleted (v2 cleanup)

- `src/commands/` (all 8 files) — replaced by skills
- `src/claude/` (runner.ts, context.ts) — replaced by native `claude -p`
- `src/config/` (loader.ts, defaults.ts) — no config file
- `src/loop/` (all 4 files) — logic moves to `tickets/priority.ts` and `tools.ts`
- `src/utils/logger.ts` — MCP server uses protocol, not terminal output
- `src/github/client.ts`, `prs.ts`, `issues.ts`, `comments.ts`, `labels.ts` — consolidated into `src/github.ts`
- Legacy CLI entrypoint — replaced by the `/cd-init` skill (Phase 1)
- `tests/artifacts.test.ts`, `tests/blocker.test.ts`, `tests/scheduler.test.ts` — replaced by new tests

### Files Ported

- `src/utils/slug.ts` — as-is (slugify, branchName)
- `src/utils/git.ts` — trimmed to `parseGitHubRemote`, `getRemoteUrl`
- `src/artifacts/meta.ts` — absorbed into `src/artifacts/artifact-store.ts`
- `src/github/labels.ts` — label definitions move into `src/github.ts`
- `tests/slug.test.ts` — kept as-is

### package.json Changes

- **Remove**: `commander`, `chalk`, `ora`, `yaml`
- **Add**: `@modelcontextprotocol/sdk`
- **Keep**: `@octokit/rest`, all dev deps
- **Update bin**: `"cd-init": "dist/bin/cd-init.js"`
- **Update main**: `"dist/src/server.js"`

---

## MCP Server

### server.ts

Entry point using `@modelcontextprotocol/sdk`. Stdio transport. Registers all tools from `tools.ts`. Server info: name `cd-server`, version from package.json.

### tools.ts — Tool Registry

Single file defining all MCP tools and dispatching to domain modules.

| Tool | Inputs | Returns | Delegates to |
|------|--------|---------|-------------|
| `cd_create_ticket` | `title`, `body`, `priority?` | Issue number + URL | `github.ts` |
| `cd_list_tickets` | `state?`, `priority?` | Array of tickets with state/priority | `github.ts` |
| `cd_get_ticket` | `issue_number` | Issue + artifacts + meta | `github.ts` + `artifact-store.ts` |
| `cd_transition_state` | `issue_number`, `new_state` | Success/failure + reason | `state-machine.ts` validates, `github.ts` swaps labels |
| `cd_pick_next_ticket` | — | Next actionable ticket or null | `priority.ts` sorts, filters deps |
| `cd_write_artifact` | `issue_number`, `type`, `content` | File path written | `artifact-store.ts` |
| `cd_read_artifacts` | `issue_number` | All artifact contents | `artifact-store.ts` |
| `cd_block_ticket` | `issue_number`, `question` | Confirmation | `github.ts` + `artifact-store.ts` |
| `cd_unblock_check` | — | List of unblocked tickets | `github.ts` scans for human replies |
| `cd_get_status` | — | Formatted board text | `github.ts` |
| `cd_ensure_labels` | — | Created/existing counts | `github.ts` |

All tools that need owner/repo call `getRepoContext()` which auto-detects from git remote.

---

## State Machine

### States

```typescript
type TicketState = 'draft' | 'refined' | 'ready' | 'in-progress' | 'in-review' | 'done' | 'blocked';
type Priority = 'p0-critical' | 'p1-high' | 'p2-medium' | 'p3-low';
```

Each state maps to a GitHub label: `cd:draft`, `cd:refined`, etc. Each priority maps to `cd:p0-critical`, `cd:p1-high`, etc.

### Transitions

```
draft       → refined, done
refined     → ready, done
ready       → in-progress, done
in-progress → in-review, done
in-review   → in-progress, done
any         → blocked           (preserves previous state in meta.json)
blocked     → (previous state)  (requires previousState parameter)
```

### state-machine.ts Exports

- **`VALID_TRANSITIONS`** — Map of `TicketState → TicketState[]`
- **`validateTransition(from, to, previousState?)`** — Returns `{ valid: true }` or `{ valid: false, reason: string }`. When transitioning from `blocked`, requires `previousState` and only allows returning to that exact state.
- **`getStateFromLabels(labels)`** — Extracts current `cd:*` state from label array. Returns `null` if none found. Throws if multiple state labels exist.
- **`labelForState(state)`** — Maps state to label name (e.g. `'draft'` → `'cd:draft'`).

### Blocked State Handling

- **Blocking**: `cd_block_ticket` saves `previousState` in meta.json, transitions to `blocked`.
- **Unblocking**: `cd_unblock_check` reads `previousState` from meta, transitions back.
- The state machine stays pure — it validates transitions, doesn't manage storage.

---

## Priority & Scheduling

### Sort Order (two-tier)

**Tier 1 — State priority** (closer to done = higher priority):
```
1. in-review    — finish reviews before starting new work
2. in-progress  — continue work already started
3. ready        — implement next ready ticket
4. refined      — approve specs
5. draft        — refine rough ideas last
```

**Tier 2 — Within same state, priority label:**
```
p0-critical > p1-high > p2-medium > p3-low
```

### priority.ts Exports

- **`sortByPriority(tickets)`** — Takes tickets with state and priority label, returns sorted array.
- **`filterActionable(tickets)`** — Removes `blocked`, `done`, and tickets with unmet dependencies (parsed from issue body `Depends on: #38, #41`).

### cd_pick_next_ticket Flow

```
list all cd:* tickets
  → filterActionable (remove blocked, done, unmet deps)
  → sortByPriority
  → return first (or null)
```

### cd_unblock_check Behavior

Scans blocked tickets for new human comments. If found, transitions back to previous state (from meta.json). Ticket re-enters normal priority queue at whatever position its restored state dictates. No special priority boost.

---

## Artifact Store

### Directory Structure

```
docs/issues/42/
├── meta.json
├── 001-draft.md
├── 002-refinement.md
├── 003-implementation.md
├── 004-review.md
└── ...
```

### artifact-store.ts Exports

- **`writeArtifact(issueNumber, type, content)`** — Next sequence number from existing files, writes `<seq>-<type>.md`, updates meta.json artifacts array. Returns file path.
- **`readArtifacts(issueNumber)`** — Reads all `*.md` files from `docs/issues/<n>/`, returns `{ file, type, content }[]` sorted by sequence.
- **`readMeta(issueNumber)`** — Reads meta.json. Returns `null` if not found.
- **`writeMeta(issueNumber, meta)`** — Writes/updates meta.json. Creates directory if needed.

### meta.json Shape

```typescript
type IssueMeta = {
  issue: number;
  title: string;
  state: TicketState;
  priority: Priority;
  branch: string | null;
  pr: number | null;
  dependencies: number[];
  artifacts: { file: string; type: string; created: string }[];
  blocked: boolean;
  blockedQuestion: string | null;
  previousState: TicketState | null;
  created: string;
  updated: string;
};
```

### Artifact Types

`'draft' | 'refinement' | 'design' | 'implementation' | 'review' | 'adjustment'`

### meta.json Creation

On first `cd_write_artifact` or `cd_block_ticket` call for a ticket. Populates by fetching issue from GitHub (title, labels, body for dependencies).

---

## GitHub Integration

### github.ts Exports

**Repo context:**
- **`getRepoContext()`** — Auto-detects `{ owner, repo }` from git remote. Throws if not GitHub.

**Issues (Octokit):**
- **`createIssue(title, body, labels)`** — Returns issue number + URL.
- **`getIssue(issueNumber)`** — Fetches issue with labels and body.
- **`listIssuesByLabel(labelPrefix)`** — Lists open issues with any `cd:*` label.
- **`updateLabels(issueNumber, add, remove)`** — Swaps labels atomically.

**Labels (Octokit):**
- **`ensureLabels(labels)`** — Creates missing `cd:*` labels. Idempotent. Label definitions hardcoded.

**Comments (Octokit):**
- **`postComment(issueNumber, body)`** — Posts structured blocking comment.
- **`getCommentsSince(issueNumber, since)`** — Returns non-bot comments after timestamp.

**PRs (gh CLI):**
- **`createPR(branch, title, body)`** — `gh pr create`. Returns PR number + URL.
- **`reviewPR(prNumber, action, body?)`** — `gh pr review --approve` or `--request-changes`.

### Auth

- Octokit: reads `GITHUB_TOKEN` env var.
- `gh` CLI: uses its own auth.

---

## Skills (Phase 1)

Eight markdown files in `skills/`, copied into target projects by `cd-init`. Each is a prompt telling Claude how to use the MCP tools. Definitions follow the v3 plan exactly:

- `/brainstorm` — Collaborative session producing vision doc + draft tickets
- `/refine` — Refine draft ticket into detailed spec
- `/implement` — Implement ready ticket on isolated branch
- `/review` — Review PR for a ticket
- `/adjust` — Apply feedback to in-progress ticket
- `/improve` — Scan codebase for tech debt, create tickets
- `/status` — Show ticket board
- `/cd-loop` — Process next ticket autonomously

### cd-init (Phase 1)

Single CLI command. Inside a target project, it:
1. Detects GitHub remote
2. Creates `docs/issues/` and `docs/visions/`
3. Copies skills into `.claude/skills/cd/`
4. Writes MCP config to `.claude/mcp.json`
5. Appends instructions to project's `CLAUDE.md`
6. Calls `cd_ensure_labels`

### GitHub Actions (Phase 2)

Persistent loop workflow: cron every 15 min + instant trigger on issue comments for blocked tickets.

---

## Phasing

### Phase 0 — MCP Server Core (implementation plan scope)

- Delete all v2 files
- Update package.json (swap deps)
- `src/server.ts`, `src/tools.ts`
- `src/tickets/state-machine.ts`, `src/tickets/priority.ts`
- `src/artifacts/artifact-store.ts`
- `src/github.ts`
- `src/utils/slug.ts`, `src/utils/git.ts`
- Tests for state-machine, priority, artifact-store, slug, github

### Phase 1 — Skills & Setup

- All 8 skill markdown files
- `bin/cd-init.ts`
- Templates (mcp-config.json, CLAUDE.md)
- End-to-end testing

### Phase 2 — Persistent Loop & Polish

- GitHub Actions workflow template
- README
- npm publish setup
- Edge cases
