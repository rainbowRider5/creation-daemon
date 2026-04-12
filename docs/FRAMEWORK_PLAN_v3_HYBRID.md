# creation-daemon — Framework Plan v3 (Hybrid Architecture)

> Revision of [FRAMEWORK_PLAN_v2.md](./FRAMEWORK_PLAN_v2.md). Instead of building a monolithic CLI that reimplements Claude Code features, we build a thin orchestration layer that plugs into Claude Code natively via **MCP Server** + **Skills** + **GitHub Actions**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code Session                   │
│                                                         │
│  Skills (user-facing)        MCP Server (logic)         │
│  ┌──────────────────┐        ┌──────────────────────┐   │
│  │ /brainstorm       │──────▶│ cd_create_tickets     │   │
│  │ /refine 42        │──────▶│ cd_transition_state   │   │
│  │ /implement 42     │──────▶│ cd_pick_next_ticket   │   │
│  │ /review 42        │──────▶│ cd_write_artifact     │   │
│  │ /adjust 42 "..."  │──────▶│ cd_read_artifacts     │   │
│  │ /improve          │──────▶│ cd_check_blocked      │   │
│  │ /status           │──────▶│ cd_get_status         │   │
│  │ /cd-loop          │──────▶│ cd_unblock_tickets    │   │
│  └──────────────────┘        └──────────────────────┘   │
│                                      │                  │
│  Native Claude Code features used:   │                  │
│  - git worktrees (--worktree)        │                  │
│  - gh CLI (issues, PRs, labels)      │                  │
│  - /loop (session-bound polling)     │                  │
│  - CLAUDE.md (project context)       │                  │
│  - hooks (pre/post tool guards)      │                  │
└──────────────────────────────────────┼──────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  GitHub Actions  │
                              │  (persistent     │
                              │   autonomous     │
                              │   loop)          │
                              └─────────────────┘
```

---

## What We DON'T Build (Claude Code Already Does It)

| v2 Component                                   | Replaced By                                 | Why                                                                                  |
| ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `bin/cd-server.ts` CLI entry point                    | Claude Code Skills (`.claude/skills/`)      | Users invoke `/refine 42` instead of `/cd-refine 42`. No separate CLI install.        |
| `src/claude/runner.ts` (spawn Claude CLI)      | Native `claude -p` with `--permission-mode` | Claude Code already handles subprocess spawning, context, permissions.               |
| `src/claude/context.ts` (gather docs + code)   | CLAUDE.md + Skill instructions              | Skills can embed context-loading instructions. Claude reads CLAUDE.md automatically. |
| `src/utils/git.ts` (branch management)         | `claude --worktree`                         | Native worktrees create isolated branches, auto-cleanup, support parallel agents.    |
| `src/commands/*.ts` (8 command files)          | Skills (`.claude/skills/*/SKILL.md`)        | Each skill is a markdown file with instructions — zero TypeScript needed.            |
| `src/claude/prompts/*.md` (agent role prompts) | Embedded in Skill definitions               | Each skill IS the prompt. No separate prompt loading layer.                          |
| `src/config/` (config loader + defaults)       | `.claude/settings.json` + MCP config        | Claude Code has its own config system. MCP server config lives in settings.          |

**Lines of code eliminated: ~2,000+ (estimated)**

---

## What We DO Build

### 1. MCP Server (`cd-server`)

A single MCP server that provides tools to Claude Code. This is the brain of the system.

```
cd-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts                 # MCP server entry point
│   │
│   ├── tools/
│   │   ├── tickets.ts            # cd_create_ticket, cd_list_tickets, cd_get_ticket
│   │   ├── transitions.ts        # cd_transition_state (enforces state machine)
│   │   ├── scheduler.ts          # cd_pick_next_ticket (priority + dependency resolution)
│   │   ├── artifacts.ts          # cd_write_artifact, cd_read_artifacts
│   │   ├── blocker.ts            # cd_block_ticket, cd_unblock_check
│   │   └── status.ts             # cd_get_status (board view)
│   │
│   ├── state-machine.ts          # Ticket lifecycle: draft→refined→ready→in-progress→in-review→done
│   ├── priority.ts               # Priority queue logic with dependency checking
│   ├── artifact-store.ts         # Versioned docs in docs/issues/<n>/
│   │
│   └── github/
│       ├── issues.ts             # Issue CRUD via gh CLI or Octokit
│       ├── labels.ts             # Ensure cd:* labels exist
│       └── comments.ts           # Structured blocking comments, reply detection
│
└── tests/
    ├── state-machine.test.ts
    ├── scheduler.test.ts
    └── artifacts.test.ts
```

#### MCP Tools Exposed

| Tool                  | Purpose                                                   | Inputs                      |
| --------------------- | --------------------------------------------------------- | --------------------------- |
| `cd_create_ticket`    | Create a GitHub issue with cd:draft label                 | title, body, priority?      |
| `cd_list_tickets`     | List all cd:\* issues with their state                    | filter?, state?             |
| `cd_get_ticket`       | Get full ticket context (issue + artifacts + meta)        | issue_number                |
| `cd_transition_state` | Move ticket to next state (validates allowed transitions) | issue_number, new_state     |
| `cd_pick_next_ticket` | Returns highest-priority actionable ticket                | —                           |
| `cd_write_artifact`   | Write numbered artifact to `docs/issues/<n>/`             | issue_number, type, content |
| `cd_read_artifacts`   | Read all artifacts for a ticket                           | issue_number                |
| `cd_block_ticket`     | Mark blocked, post structured question to GitHub          | issue_number, question      |
| `cd_unblock_check`    | Scan blocked tickets for human replies, unblock them      | —                           |
| `cd_get_status`       | Return full board state as formatted text                 | —                           |
| `cd_ensure_labels`    | Create cd:\* labels on repo if missing                    | —                           |

#### State Machine Enforcement

```
                ┌──────────┐
                │  draft   │
                └────┬─────┘
                     │ refine
                     ▼
                ┌──────────┐
          ┌─────│ refined  │
          │     └────┬─────┘
          │          │ approve
          │          ▼
          │     ┌──────────┐
          │     │  ready   │
          │     └────┬─────┘
          │          │ implement
          │          ▼
          │  ┌─────────────┐
          │  │ in-progress  │◀──┐
          │  └──────┬──────┘   │
          │         │ open PR   │ request changes
          │         ▼          │
          │  ┌─────────────┐   │
          │  │  in-review   │──┘
          │  └──────┬──────┘
          │         │ approve
          │         ▼
          │     ┌──────┐
          └────▶│ done │  (any state can skip to done)
                └──────┘

Any state can also → blocked → (original state)
```

`cd_transition_state` validates transitions and rejects invalid ones.

---

### 2. Skills (`.claude/skills/`)

Each skill is a markdown file. No TypeScript. They tell Claude how to use the MCP tools.

#### `/brainstorm`

```
.claude/skills/brainstorm/SKILL.md
```

````yaml
---
name: brainstorm
description: "Collaborative brainstorming session that produces a vision doc and draft tickets"
allowed-tools:
  - mcp__cd-server__cd_create_ticket
  - mcp__cd-server__cd_write_artifact
  - Bash
  - Edit
  - Write
  - Read
---

# Brainstorm Session

You are running an interactive brainstorming session with the user about: $ARGUMENTS

## Process
1. Discuss the idea collaboratively. Ask clarifying questions. Push back on complexity.
2. Once the idea is shaped, write a vision doc to `docs/visions/<slug>.md`
3. Break the vision into discrete tickets using `cd_create_ticket` (each gets cd:draft label)
4. Each ticket should be small enough to implement in one session

## Vision Doc Format
```markdown
# <Title>

## Problem
What problem does this solve?

## Solution
High-level approach.

## Tickets
- #<n> — <title>
- #<n> — <title>
````

## Rules

- Keep tickets small and independent where possible
- Note dependencies between tickets in the body: "Depends on: #X"
- Default priority is p2-medium unless the user says otherwise

```

#### `/refine`

```

.claude/skills/refine/SKILL.md

````

```yaml
---
name: refine
description: "Refine a draft ticket into a detailed spec with acceptance criteria"
allowed-tools:
  - mcp__cd-server__cd_get_ticket
  - mcp__cd-server__cd_write_artifact
  - mcp__cd-server__cd_transition_state
  - mcp__cd-server__cd_block_ticket
  - Read
  - Grep
  - Glob
---

# Refine Ticket

Refine ticket #$ARGUMENTS into a detailed spec.

## Process
1. Read the ticket and any existing artifacts using `cd_get_ticket`
2. Examine the codebase to understand the current state
3. Write a refinement artifact with `cd_write_artifact` (type: "refinement")
4. Transition the ticket to "refined" with `cd_transition_state`

## Refinement Artifact Contents
- **Goal**: What this ticket accomplishes
- **Current State**: What exists today (with file paths)
- **Approach**: Step-by-step implementation plan
- **Files to Change**: List of files with expected modifications
- **Acceptance Criteria**: Testable checklist
- **Open Questions**: Anything that needs human input

## If Blocked
If you need human input to proceed, use `cd_block_ticket` with specific questions.
Don't guess at architectural decisions — ask.
````

#### `/implement`

```
.claude/skills/implement/SKILL.md
```

```yaml
---
name: implement
description: "Implement a ready ticket on an isolated branch"
allowed-tools:
  - mcp__cd-server__cd_get_ticket
  - mcp__cd-server__cd_write_artifact
  - mcp__cd-server__cd_transition_state
  - mcp__cd-server__cd_block_ticket
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
1. Read the ticket, spec, and all artifacts using `cd_get_ticket`
2. Create a branch: `cc/<issue>-<slug>` (or use existing if in-progress)
3. Transition to "in-progress" with `cd_transition_state`
4. Implement the changes following the spec
5. Commit with messages prefixed: `[cc#<issue>]`
6. Write an implementation artifact with `cd_write_artifact` (type: "implementation")
7. Push and open a PR with `gh pr create`
8. Transition to "in-review" with `cd_transition_state`

## Rules
- Follow the spec from the refinement artifact
- Commit frequently with descriptive messages
- Don't modify files outside the ticket's scope
- If blocked, use `cd_block_ticket` — don't guess

## Implementation Artifact Contents
- What was built
- Key decisions made during coding
- Any deviations from the spec and why
- How to test
```

#### `/review`

```
.claude/skills/review/SKILL.md
```

```yaml
---
name: review
description: "Review a PR for a ticket"
allowed-tools:
  - mcp__cd-server__cd_get_ticket
  - mcp__cd-server__cd_write_artifact
  - mcp__cd-server__cd_transition_state
  - Bash
  - Read
  - Grep
  - Glob
---

# Review Ticket

Review the PR for ticket #$ARGUMENTS.

## Process
1. Read the ticket and all artifacts using `cd_get_ticket`
2. Read the PR diff: `gh pr diff <pr_number>`
3. Check: does the implementation match the spec?
4. Check: code quality, edge cases, security, tests
5. Write a review artifact with `cd_write_artifact` (type: "review")
6. If approved: approve the PR with `gh pr review --approve` and transition to "done"
7. If changes needed: request changes with `gh pr review --request-changes` and transition back to "in-progress"

## Review Artifact Contents
- Summary of changes reviewed
- Issues found (if any)
- Verdict: approved or changes requested
- If changes requested: specific actionable feedback
```

#### `/adjust`

```
.claude/skills/adjust/SKILL.md
```

```yaml
---
name: adjust
description: "Apply feedback or adjustments to a ticket"
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

Apply the following adjustment to ticket being discussed or specified: $ARGUMENTS

## Process
1. Read the ticket and all artifacts using `cd_get_ticket`
2. Understand the requested change
3. Make the changes on the existing branch
4. Write an adjustment artifact with `cd_write_artifact` (type: "adjustment")
5. Commit with `[cc#<issue>] adjust: <summary>`
6. Push to update the PR
```

#### `/improve`

```
.claude/skills/improve/SKILL.md
```

```yaml
---
name: improve
description: "Scan the codebase for tech debt and create improvement tickets"
allowed-tools:
  - mcp__cd-server__cd_create_ticket
  - Read
  - Grep
  - Glob
  - Bash
---

# Improve Scan

Scan the codebase for tech debt, code smells, and improvement opportunities.

## Process
1. Examine the project structure and key files
2. Look for: TODO/FIXME comments, code duplication, missing tests, outdated deps, security issues
3. For each finding, create a draft ticket with `cd_create_ticket` (priority p3-low unless urgent)
4. Report a summary of findings to the user
```

#### `/status`

```
.claude/skills/status/SKILL.md
```

```yaml
---
name: status
description: "Show the current ticket board"
allowed-tools:
  - mcp__cd-server__cd_get_status
---

# Status Board

Show the current state of all tickets.

## Process
1. Call `cd_get_status` to get the full board
2. Display it in a clean, readable format
```

#### `/cd-loop`

```
.claude/skills/cd-loop/SKILL.md
```

```yaml
---
name: cd-loop
description: "Process the next ticket autonomously based on priority"
allowed-tools:
  - mcp__cd-server__cd_pick_next_ticket
  - mcp__cd-server__cd_get_ticket
  - mcp__cd-server__cd_transition_state
  - mcp__cd-server__cd_write_artifact
  - mcp__cd-server__cd_block_ticket
  - mcp__cd-server__cd_unblock_check
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
---

# Autonomous Loop Iteration

Process the highest-priority ticket.

## Process
1. Run `cd_unblock_check` to unblock any tickets with human replies
2. Run `cd_pick_next_ticket` to get the next actionable ticket
3. If no ticket: report "Nothing to do" and stop
4. Based on the ticket's state, perform the appropriate action:
   - **draft** → Refine it (follow /refine process)
   - **refined** → Approve and transition to ready (or block if questions)
   - **ready** → Implement it (follow /implement process)
   - **in-progress** → Continue implementation
   - **in-review** → Review it (follow /review process)
   - **unblocked** → Resume from where it was blocked
5. After completing the action, report what was done

## Usage with /loop
To run continuously: use Claude Code's native `/loop` command with this skill.
For persistent background: use the GitHub Actions workflow.
```

---

### 3. GitHub Action (Persistent Loop)

For autonomous operation that survives session restarts:

```yaml
# .github/workflows/cd-loop.yml
name: creation-daemon autonomous loop

on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes
  issue_comment:
    types: [created] # Trigger immediately on human reply
  workflow_dispatch: # Manual trigger

jobs:
  process-ticket:
    runs-on: ubuntu-latest
    if: >
      github.event_name == 'schedule' ||
      github.event_name == 'workflow_dispatch' ||
      (github.event_name == 'issue_comment' &&
       !contains(github.event.comment.user.login, '[bot]') &&
       contains(toJSON(github.event.issue.labels.*.name), 'cd:blocked'))
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install cd-server
        run: npm install -g cd-server

      - name: Run one loop iteration
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          claude -p "/cd-loop" \
            --permission-mode acceptEdits \
            --max-turns 50 \
            --mcp-config .claude/mcp.json
```

This gives you:

- **Scheduled polling** every 15 minutes
- **Instant reaction** to human replies on blocked tickets (via `issue_comment` trigger)
- **Manual override** via `workflow_dispatch`

---

### 4. Setup (`/cd-init` → remains a small CLI or a skill)

The only CLI command worth keeping, or can be a skill too:

```
.claude/skills/cd-init/SKILL.md
```

This skill would:

1. Detect GitHub remote from git
2. Create `docs/issues/` and `docs/visions/` directories
3. Ensure `cd:*` labels exist on the repo (via `cd_ensure_labels`)
4. Configure the MCP server in `.claude/settings.json`
5. Copy skills into `.claude/skills/`
6. Optionally set up the GitHub Action workflow

---

## Revised Repository Structure

```
creation-daemon/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE (MIT)
│
├── cd-server/                        # MCP Server (the brain)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts                 # MCP entry point
│   │   ├── tools/
│   │   │   ├── tickets.ts
│   │   │   ├── transitions.ts
│   │   │   ├── scheduler.ts
│   │   │   ├── artifacts.ts
│   │   │   ├── blocker.ts
│   │   │   └── status.ts
│   │   ├── state-machine.ts
│   │   ├── priority.ts
│   │   ├── artifact-store.ts
│   │   └── github/
│   │       ├── issues.ts
│   │       ├── labels.ts
│   │       └── comments.ts
│   └── tests/
│
├── skills/                           # Copied into target project
│   ├── brainstorm/SKILL.md
│   ├── refine/SKILL.md
│   ├── implement/SKILL.md
│   ├── review/SKILL.md
│   ├── adjust/SKILL.md
│   ├── improve/SKILL.md
│   ├── status/SKILL.md
│   └── cd-loop/SKILL.md
│
├── templates/
│   ├── github-action.yml             # Persistent loop workflow
│   ├── mcp-config.json               # MCP server configuration
│   └── CLAUDE.md                     # Project instructions template
│
└── bin/
    └── cd-init.ts                    # Setup script (or also a skill)
```

---

## Revised Implementation Roadmap

### Phase 0 — MCP Server Core (3-4 days)

- [ ] MCP server scaffolding with `@modelcontextprotocol/sdk`
- [ ] State machine with transition validation
- [ ] `cd_create_ticket`, `cd_list_tickets`, `cd_get_ticket` tools (wrapping `gh` CLI)
- [ ] `cd_transition_state` tool
- [ ] `cd_ensure_labels` tool
- [ ] `cd_get_status` tool
- [ ] Tests for state machine and transitions

### Phase 1 — Artifacts & Scheduling (3-4 days)

- [ ] Artifact store: `cd_write_artifact`, `cd_read_artifacts`
- [ ] meta.json management
- [ ] Priority queue with dependency resolution: `cd_pick_next_ticket`
- [ ] `cd_block_ticket` and `cd_unblock_check` tools
- [ ] Tests for scheduler and blocker

### Phase 2 — Skills & Integration (2-3 days)

- [ ] Write all skill definitions
- [ ] `cd-init` setup script
- [ ] MCP config template
- [ ] CLAUDE.md template for target projects
- [ ] End-to-end testing: install into a test repo, run a full cycle

### Phase 3 — Persistent Loop & Polish (2-3 days)

- [ ] GitHub Actions workflow template
- [ ] Test the Action: schedule, issue_comment trigger, workflow_dispatch
- [ ] README with usage examples
- [ ] npm publish setup for cd-server
- [ ] Edge cases: concurrent runs, git conflicts, stale state

### Future

- [ ] Slack/Discord notifications (MCP server adds webhook tool)
- [ ] Web dashboard (reads artifact store + GitHub API)
- [ ] Multi-agent concurrency (multiple worktrees via `/batch`)
- [ ] Custom skill plugins (users add their own skills)

---

## Plugin Ecosystem — Composition Strategy

creation-daemon is designed to **compose at runtime** with existing Claude Code plugins rather than depend on or duplicate them.

### Relationship to existing plugins

| Plugin                                              | What it does                                                                                                                    | Relationship to creation-daemon                                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [superpowers](https://github.com/obra/superpowers)  | Dev workflow quality — brainstorming, TDD, systematic debugging, subagent-driven development, code review                       | **Orthogonal.** superpowers improves _how_ dev work is done. creation-daemon handles _what_ to work on and _when_ (ticket lifecycle, priority scheduling, autonomous loop). Users install both for enhanced quality during autonomous work. |
| [impeccable](https://github.com/pbakaus/impeccable) | Frontend design quality — 18 steering commands (`/audit`, `/critique`, `/polish`, etc.) that prevent generic AI design patterns | **Orthogonal.** Useful for frontend-heavy projects. Recommend in docs, no dependency.                                                                                                                                                     |

### Design principles

- **No code sharing or dependencies** — creation-daemon is self-contained
- **No feature duplication** — don't rebuild brainstorming/TDD/review that superpowers already provides
- **Coexistence** — skills and MCP tools are namespaced (`cd_*`) to avoid conflicts
- **Document compatibility** — README should mention superpowers and impeccable as recommended companions
- **Align conventions** — follow standard Claude Code plugin/skill file format so plugins coexist cleanly

### How they complement each other

```
superpowers  → enhances quality of work within each ticket
impeccable   → enhances design quality for frontend tickets
creation-daemon → decides WHICH ticket to work on, WHEN, and manages the lifecycle
```

---

## Comparison: v2 vs v3

| Metric                    | v2 (Monolithic CLI)             | v3 (Hybrid)                                 |
| ------------------------- | ------------------------------- | ------------------------------------------- |
| Custom TypeScript         | ~3,000-4,000 LOC                | ~1,000-1,500 LOC                            |
| Dependencies              | commander, octokit, many utils  | `@modelcontextprotocol/sdk`, `gh` CLI       |
| Install process           | `npm install -g creation-daemon`  | `npm install -g cd-server` + `cd-init`      |
| User interface            | Separate `cd-server` CLI               | Native Claude Code skills (`/refine`, etc.) |
| Git management            | Custom branch/commit helpers    | Native `--worktree`                         |
| Agent spawning            | Custom Claude CLI wrapper       | Native `claude -p`                          |
| Persistent loop           | Custom daemon (fragile)         | GitHub Actions (robust)                     |
| Extensibility             | Custom plugin system needed     | Add more skills (just markdown)             |
| Works without Claude Code | No (requires Claude CLI anyway) | No (designed for Claude Code)               |
